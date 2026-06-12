import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryAlertType,
  Prisma,
  StockTransactionType,
} from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { InventoryQueryDto } from '../dto/inventory-query.dto';
import type { StockAdjustmentDto } from '../dto/stock-adjustment.dto';
import type { StockTransferDto } from '../dto/stock-transfer.dto';
import { InventoryEvent } from '../enums/inventory-events';
import {
  requireInventoryRead,
  requireInventoryWrite,
  resolveInventoryScope,
} from './inventory-access.util';
import { InventoryEventsService } from './inventory-events.service';
import { decimal, pageMeta } from './inventory-response.util';

const stockInclude = {
  ingredient: { include: { unit: true, category: true } },
  batches: { orderBy: { expiryDate: 'asc' as const } },
} satisfies Prisma.InventoryStockInclude;
type StockRecord = Prisma.InventoryStockGetPayload<{ include: typeof stockInclude }>;

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: InventoryEventsService,
  ) {}

  async findAll(query: InventoryQueryDto, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.InventoryStockWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        ...(query.ingredientId ? { ingredientId: query.ingredientId } : {}),
        ...(query.search
          ? {
              ingredient: {
                OR: [
                  { name: { contains: query.search.trim(), mode: 'insensitive' } },
                  { sku: { contains: query.search.trim(), mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.inventoryStock.findMany({
          where,
          include: stockInclude,
          orderBy: { ingredient: { name: 'asc' } },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.inventoryStock.count({ where }),
      ]);
      return { data: data.map((stock) => this.map(stock)), meta: pageMeta(query.page, query.limit, total) };
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const stock = await tx.inventoryStock.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include: {
          ...stockInclude,
          transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
        },
      });
      if (!stock) throw new NotFoundException('Inventory stock not found');
      return {
        ...this.map(stock),
        transactions: stock.transactions.map((item) => ({
          ...item,
          quantity: decimal(item.quantity),
        })),
      };
    });
  }

  async adjust(dto: StockAdjustmentDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const scope = resolveInventoryScope(dto.tenantId, dto.outletId, user, true);
    const allowed = new Set<StockTransactionType>([
      StockTransactionType.ADJUSTMENT_IN,
      StockTransactionType.ADJUSTMENT_OUT,
      StockTransactionType.WASTAGE,
      StockTransactionType.RETURN,
    ]);
    if (!allowed.has(dto.transactionType)) {
      throw new BadRequestException('Invalid stock adjustment type');
    }
    const incoming =
      dto.transactionType === StockTransactionType.ADJUSTMENT_IN ||
      dto.transactionType === StockTransactionType.RETURN;
    const delta = new Prisma.Decimal(incoming ? dto.quantity : -dto.quantity);
    const result = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const tenantId = await this.assertOutletIngredient(
        tx,
        scope.tenantId,
        dto.outletId,
        dto.ingredientId,
      );
      const stock = await this.ensureStock(tx, tenantId, dto.outletId, dto.ingredientId);
      await this.lock(tx, stock.id);
      if (delta.isNegative() && stock.availableQuantity.lessThan(delta.abs())) {
        throw new ConflictException('Insufficient available stock');
      }
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: {
          availableQuantity: { increment: delta },
          ...(dto.transactionType === StockTransactionType.WASTAGE
            ? { damagedQuantity: { increment: dto.quantity } }
            : {}),
          lastStockUpdate: new Date(),
          version: { increment: 1 },
        },
      });
      const transaction = await tx.stockTransaction.create({
        data: {
          tenantId,
          outletId: dto.outletId,
          stockId: stock.id,
          ingredientId: dto.ingredientId,
          transactionType: dto.transactionType,
          quantity: delta,
          unitCost: dto.unitCost ?? stock.ingredient.costPrice,
          referenceType: 'ADJUSTMENT',
          notes: dto.reason.trim(),
          performedByUserId: user.id,
        },
      });
      if (incoming && dto.batchNumber) {
        await this.upsertBatch(tx, {
          tenantId,
          outletId: dto.outletId,
          stockId: stock.id,
          ingredientId: dto.ingredientId,
          batchNumber: dto.batchNumber,
          quantity: dto.quantity,
          manufacturingDate: dto.manufacturingDate,
          expiryDate: dto.expiryDate,
        });
      }
      await this.refreshAlerts(tx, tenantId, dto.outletId, dto.ingredientId);
      return { ...transaction, quantity: decimal(transaction.quantity) };
    });
    this.events.publish({
      type: InventoryEvent.stockAdjusted,
      tenantId: scope.tenantId ?? result.tenantId,
      outletId: dto.outletId,
      ingredientId: dto.ingredientId,
      referenceId: result.id,
      occurredAt: new Date().toISOString(),
    });
    return result;
  }

  async transfer(dto: StockTransferDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    if (dto.fromOutletId === dto.toOutletId) {
      throw new BadRequestException('Source and destination outlets must differ');
    }
    const sourceScope = resolveInventoryScope(dto.tenantId, dto.fromOutletId, user, true);
    if (!user.roles.includes('SUPER_ADMIN') && !user.roles.includes('TENANT_ADMIN')) {
      throw new BadRequestException('Cross-outlet transfers require tenant-wide access');
    }
    const referenceId = crypto.randomUUID();
    const result = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, sourceScope.tenantId);
      const tenantId = await this.assertTransferReferences(tx, sourceScope.tenantId, dto);
      const source = await this.ensureStock(tx, tenantId, dto.fromOutletId, dto.ingredientId);
      const target = await this.ensureStock(tx, tenantId, dto.toOutletId, dto.ingredientId);
      await this.lock(tx, source.id);
      if (source.availableQuantity.lessThan(dto.quantity)) {
        throw new ConflictException('Insufficient available stock');
      }
      const now = new Date();
      await tx.inventoryStock.update({
        where: { id: source.id },
        data: {
          availableQuantity: { decrement: dto.quantity },
          lastStockUpdate: now,
          version: { increment: 1 },
        },
      });
      await tx.inventoryStock.update({
        where: { id: target.id },
        data: {
          availableQuantity: { increment: dto.quantity },
          lastStockUpdate: now,
          version: { increment: 1 },
        },
      });
      await tx.stockTransaction.createMany({
        data: [
          {
            tenantId,
            outletId: dto.fromOutletId,
            stockId: source.id,
            ingredientId: dto.ingredientId,
            transactionType: StockTransactionType.TRANSFER_OUT,
            quantity: -dto.quantity,
            unitCost: source.ingredient.costPrice,
            referenceType: 'TRANSFER',
            referenceId,
            notes: dto.notes?.trim(),
            performedByUserId: user.id,
          },
          {
            tenantId,
            outletId: dto.toOutletId,
            stockId: target.id,
            ingredientId: dto.ingredientId,
            transactionType: StockTransactionType.TRANSFER_IN,
            quantity: dto.quantity,
            unitCost: source.ingredient.costPrice,
            referenceType: 'TRANSFER',
            referenceId,
            notes: dto.notes?.trim(),
            performedByUserId: user.id,
          },
        ],
      });
      await Promise.all([
        this.refreshAlerts(tx, tenantId, dto.fromOutletId, dto.ingredientId),
        this.refreshAlerts(tx, tenantId, dto.toOutletId, dto.ingredientId),
      ]);
      return { id: referenceId, tenantId, ingredientId: dto.ingredientId, quantity: dto.quantity };
    });
    this.events.publish({
      type: InventoryEvent.stockTransferred,
      tenantId: result.tenantId,
      outletId: dto.fromOutletId,
      ingredientId: dto.ingredientId,
      referenceId,
      occurredAt: new Date().toISOString(),
    });
    return result;
  }

  async valuation(query: InventoryQueryDto, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const stocks = await tx.inventoryStock.findMany({
        where: {
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include: { ingredient: true },
      });
      const items = stocks.map((stock) => {
        const quantity = decimal(stock.availableQuantity);
        return {
          ingredientId: stock.ingredientId,
          ingredientName: stock.ingredient.name,
          outletId: stock.outletId,
          quantity,
          unitCost: stock.ingredient.costPrice,
          value: Math.round(quantity * stock.ingredient.costPrice),
        };
      });
      return {
        totalInventoryValue: items.reduce((sum, item) => sum + item.value, 0),
        totalIngredients: new Set(items.map((item) => item.ingredientId)).size,
        items,
      };
    });
  }

  async applyMovement(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      outletId: string;
      ingredientId: string;
      quantity: number;
      unitCost: number;
      referenceId: string;
      userId: string;
    },
  ) {
    const stock = await this.ensureStock(tx, input.tenantId, input.outletId, input.ingredientId);
    await this.lock(tx, stock.id);
    await tx.inventoryStock.update({
      where: { id: stock.id },
      data: {
        availableQuantity: { increment: input.quantity },
        lastStockUpdate: new Date(),
        version: { increment: 1 },
      },
    });
    await tx.stockTransaction.create({
      data: {
        tenantId: input.tenantId,
        outletId: input.outletId,
        stockId: stock.id,
        ingredientId: input.ingredientId,
        transactionType: StockTransactionType.PURCHASE,
        quantity: input.quantity,
        unitCost: input.unitCost,
        referenceType: 'PURCHASE_ORDER',
        referenceId: input.referenceId,
        performedByUserId: input.userId,
      },
    });
    await this.refreshAlerts(tx, input.tenantId, input.outletId, input.ingredientId);
    return stock.id;
  }

  async refreshAlerts(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    ingredientId: string,
  ) {
    const stock = await tx.inventoryStock.findUniqueOrThrow({
      where: { tenantId_outletId_ingredientId: { tenantId, outletId, ingredientId } },
      include: { ingredient: true },
    });
    const quantity = stock.availableQuantity;
    const desired =
      quantity.lessThan(0)
        ? InventoryAlertType.NEGATIVE_STOCK
        : quantity.equals(0)
          ? InventoryAlertType.OUT_OF_STOCK
          : quantity.lessThanOrEqualTo(stock.ingredient.reorderLevel)
            ? InventoryAlertType.LOW_STOCK
            : null;
    await tx.inventoryAlert.updateMany({
      where: {
        tenantId,
        outletId,
        ingredientId,
        isResolved: false,
        alertType: { in: [InventoryAlertType.LOW_STOCK, InventoryAlertType.OUT_OF_STOCK, InventoryAlertType.NEGATIVE_STOCK] },
        ...(desired ? { NOT: { alertType: desired } } : {}),
      },
      data: { isResolved: true, resolvedAt: new Date() },
    });
    if (!desired) return;
    const existing = await tx.inventoryAlert.findFirst({
      where: { tenantId, outletId, ingredientId, alertType: desired, isResolved: false },
    });
    if (!existing) {
      await tx.inventoryAlert.create({
        data: {
          tenantId,
          outletId,
          ingredientId,
          alertType: desired,
          message: `${stock.ingredient.name} has ${quantity.toString()} units available`,
        },
      });
      this.events.publish({
        type: InventoryEvent.inventoryAlertCreated,
        tenantId,
        outletId,
        ingredientId,
        occurredAt: new Date().toISOString(),
      });
    }
  }

  private async ensureStock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    ingredientId: string,
  ) {
    return tx.inventoryStock.upsert({
      where: { tenantId_outletId_ingredientId: { tenantId, outletId, ingredientId } },
      update: {},
      create: { tenantId, outletId, ingredientId },
      include: { ingredient: true },
    });
  }

  private async assertOutletIngredient(
    tx: Prisma.TransactionClient,
    tenantId: string | undefined,
    outletId: string,
    ingredientId: string,
  ) {
    const outlet = await tx.outlet.findFirst({
      where: { id: outletId, deletedAt: null, ...(tenantId ? { tenantId } : {}) },
      select: { tenantId: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    const ingredient = await tx.ingredient.count({
      where: { id: ingredientId, tenantId: outlet.tenantId, deletedAt: null, isActive: true },
    });
    if (ingredient !== 1) throw new NotFoundException('Ingredient not found');
    return outlet.tenantId;
  }

  private async assertTransferReferences(
    tx: Prisma.TransactionClient,
    tenantId: string | undefined,
    dto: StockTransferDto,
  ) {
    const outlets = await tx.outlet.findMany({
      where: {
        id: { in: [dto.fromOutletId, dto.toOutletId] },
        deletedAt: null,
        ...(tenantId ? { tenantId } : {}),
      },
      select: { tenantId: true },
    });
    if (outlets.length !== 2 || outlets[0].tenantId !== outlets[1].tenantId) {
      throw new BadRequestException('Both outlets must belong to the same tenant');
    }
    const resolvedTenant = outlets[0].tenantId;
    if (
      (await tx.ingredient.count({
        where: { id: dto.ingredientId, tenantId: resolvedTenant, deletedAt: null },
      })) !== 1
    ) {
      throw new NotFoundException('Ingredient not found');
    }
    return resolvedTenant;
  }

  private lock(tx: Prisma.TransactionClient, stockId: string) {
    return tx.$queryRaw`SELECT "id" FROM "inventory_stocks" WHERE "id" = ${stockId}::uuid FOR UPDATE`;
  }

  private async upsertBatch(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      outletId: string;
      stockId: string;
      ingredientId: string;
      batchNumber: string;
      quantity: number;
      manufacturingDate?: string;
      expiryDate?: string;
    },
  ) {
    const manufacturingDate = input.manufacturingDate
      ? new Date(input.manufacturingDate)
      : undefined;
    const expiryDate = input.expiryDate ? new Date(input.expiryDate) : undefined;
    if (manufacturingDate && expiryDate && expiryDate < manufacturingDate) {
      throw new BadRequestException('Expiry date cannot precede manufacturing date');
    }
    await tx.inventoryBatch.upsert({
      where: {
        tenantId_outletId_ingredientId_batchNumber: {
          tenantId: input.tenantId,
          outletId: input.outletId,
          ingredientId: input.ingredientId,
          batchNumber: input.batchNumber.trim(),
        },
      },
      update: { quantity: { increment: input.quantity }, expiryDate, manufacturingDate },
      create: {
        tenantId: input.tenantId,
        outletId: input.outletId,
        stockId: input.stockId,
        ingredientId: input.ingredientId,
        batchNumber: input.batchNumber.trim(),
        quantity: input.quantity,
        expiryDate,
        manufacturingDate,
      },
    });
    if (expiryDate && expiryDate.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000) {
      const existing = await tx.inventoryAlert.findFirst({
        where: {
          tenantId: input.tenantId,
          outletId: input.outletId,
          ingredientId: input.ingredientId,
          alertType: InventoryAlertType.EXPIRY_WARNING,
          isResolved: false,
        },
      });
      if (!existing) {
        await tx.inventoryAlert.create({
          data: {
            tenantId: input.tenantId,
            outletId: input.outletId,
            ingredientId: input.ingredientId,
            alertType: InventoryAlertType.EXPIRY_WARNING,
            message: `Batch ${input.batchNumber.trim()} expires on ${expiryDate.toISOString().slice(0, 10)}`,
          },
        });
      }
    }
  }

  private map(stock: StockRecord) {
    return {
      ...stock,
      availableQuantity: decimal(stock.availableQuantity),
      reservedQuantity: decimal(stock.reservedQuantity),
      damagedQuantity: decimal(stock.damagedQuantity),
      ingredient: {
        ...stock.ingredient,
        reorderLevel: decimal(stock.ingredient.reorderLevel),
        minimumStock: decimal(stock.ingredient.minimumStock),
        maximumStock: stock.ingredient.maximumStock
          ? decimal(stock.ingredient.maximumStock)
          : null,
        unit: {
          ...stock.ingredient.unit,
          conversionFactor: decimal(stock.ingredient.unit.conversionFactor),
        },
      },
      batches: stock.batches.map((batch) => ({ ...batch, quantity: decimal(batch.quantity) })),
    };
  }
}
