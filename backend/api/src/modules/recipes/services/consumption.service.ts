import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryConsumptionTrigger,
  Prisma,
  StockTransactionType,
} from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { StockService } from '../../inventory/services/stock.service';
import type { RecipeQueryDto } from '../dto/recipe-query.dto';
import type { WastageDto } from '../dto/wastage.dto';
import { RecipeEvent } from '../enums/recipe-events';
import { requireRecipeAccess, resolveRecipeScope } from './recipe-access.util';
import { RecipeEventsService } from './recipe-events.service';

const consumptionInclude = {
  ingredient: { include: { unit: true } },
  recipe: { select: { id: true, name: true } },
  order: { select: { id: true, orderNumber: true } },
} satisfies Prisma.InventoryConsumptionInclude;

@Injectable()
export class ConsumptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly events: RecipeEventsService,
  ) {}

  async consumeOrderInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    trigger: InventoryConsumptionTrigger,
    userId: string,
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        outlet: {
          select: {
            allowNegativeStock: true,
            consumptionTrigger: true,
          },
        },
        items: {
          where: { deletedAt: null },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.outlet.consumptionTrigger !== trigger) {
      return { consumed: 0, skipped: true };
    }

    let consumed = 0;
    for (const item of order.items) {
      const recipe = await this.resolveRecipe(
        tx,
        order.tenantId,
        item.menuItemId,
        item.variantId,
      );
      if (!recipe) continue;

      for (const line of recipe.ingredients) {
        const exists = await tx.inventoryConsumption.findUnique({
          where: {
            tenantId_orderItemId_ingredientId: {
              tenantId: order.tenantId,
              orderItemId: item.id,
              ingredientId: line.ingredientId,
            },
          },
          select: { id: true },
        });
        if (exists) continue;

        const quantity = this.consumptionQuantity(
          line.quantity,
          line.unit.conversionFactor,
          line.ingredient.unit.conversionFactor,
          line.wastagePercentage,
          recipe.yieldQuantity,
          recipe.portionMultiplier,
          item.quantity,
        );
        const stock = await tx.inventoryStock.upsert({
          where: {
            tenantId_outletId_ingredientId: {
              tenantId: order.tenantId,
              outletId: order.outletId,
              ingredientId: line.ingredientId,
            },
          },
          update: {},
          create: {
            tenantId: order.tenantId,
            outletId: order.outletId,
            ingredientId: line.ingredientId,
          },
          include: { ingredient: true },
        });
        await this.lockStock(tx, stock.id);
        const current = await tx.inventoryStock.findUniqueOrThrow({
          where: { id: stock.id },
          include: { ingredient: true },
        });
        if (!order.outlet.allowNegativeStock && current.availableQuantity.lessThan(quantity)) {
          this.events.publish({
            type: RecipeEvent.inventoryShortageDetected,
            tenantId: order.tenantId,
            outletId: order.outletId,
            referenceId: order.id,
          });
          throw new ConflictException(
            `Insufficient ${current.ingredient.name} stock for order ${order.orderNumber}`,
          );
        }

        const cost = Math.round(quantity.toNumber() * current.ingredient.costPrice);
        const record = await tx.inventoryConsumption.create({
          data: {
            tenantId: order.tenantId,
            outletId: order.outletId,
            orderId: order.id,
            orderItemId: item.id,
            recipeId: recipe.id,
            ingredientId: line.ingredientId,
            unitId: line.ingredient.unitId,
            consumedQuantity: quantity,
            costAtConsumption: cost,
            trigger,
            triggeredByUserId: userId,
            businessDate: order.businessDate,
          },
        });
        await tx.inventoryStock.update({
          where: { id: current.id },
          data: {
            availableQuantity: { decrement: quantity },
            lastStockUpdate: new Date(),
            version: { increment: 1 },
          },
        });
        await tx.stockTransaction.create({
          data: {
            tenantId: order.tenantId,
            outletId: order.outletId,
            stockId: current.id,
            ingredientId: line.ingredientId,
            transactionType: StockTransactionType.CONSUMPTION,
            quantity: quantity.negated(),
            unitCost: current.ingredient.costPrice,
            referenceType: 'ORDER_CONSUMPTION',
            referenceId: record.id,
            performedByUserId: userId,
          },
        });
        await this.stock.refreshAlerts(
          tx,
          order.tenantId,
          order.outletId,
          line.ingredientId,
        );
        consumed += 1;
      }
    }
    if (consumed > 0) {
      this.events.publish({
        type: RecipeEvent.inventoryConsumed,
        tenantId: order.tenantId,
        outletId: order.outletId,
        referenceId: order.id,
      });
    }
    return { consumed, skipped: false };
  }

  async list(query: RecipeQueryDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.InventoryConsumptionWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
      };
      const [data, total] = await Promise.all([
        tx.inventoryConsumption.findMany({
          where,
          include: consumptionInclude,
          orderBy: { consumedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.inventoryConsumption.count({ where }),
      ]);
      return {
        data: data.map((item) => this.mapConsumption(item)),
        meta: this.pageMeta(query.page, query.limit, total),
      };
    });
  }

  async detail(id: string, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const record = await tx.inventoryConsumption.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include: consumptionInclude,
      });
      if (!record) throw new NotFoundException('Inventory consumption not found');
      return this.mapConsumption(record);
    });
  }

  async recordWastage(dto: WastageDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(dto.tenantId, dto.outletId, user, true);
    const result = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const outlet = await tx.outlet.findFirst({
        where: {
          id: dto.outletId,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
        select: { tenantId: true, allowNegativeStock: true },
      });
      if (!outlet) throw new NotFoundException('Outlet not found');
      const ingredient = await tx.ingredient.findFirst({
        where: { id: dto.ingredientId, tenantId: outlet.tenantId, deletedAt: null },
        include: { unit: true },
      });
      const inputUnit = await tx.unitOfMeasure.findFirst({
        where: { id: dto.unitId, tenantId: outlet.tenantId, deletedAt: null },
      });
      if (!ingredient || !inputUnit) {
        throw new NotFoundException('Ingredient or unit of measure not found');
      }
      const quantity = new Prisma.Decimal(dto.quantity)
        .mul(inputUnit.conversionFactor)
        .div(ingredient.unit.conversionFactor)
        .toDecimalPlaces(3);
      const stock = await tx.inventoryStock.upsert({
        where: {
          tenantId_outletId_ingredientId: {
            tenantId: outlet.tenantId,
            outletId: dto.outletId,
            ingredientId: dto.ingredientId,
          },
        },
        update: {},
        create: {
          tenantId: outlet.tenantId,
          outletId: dto.outletId,
          ingredientId: dto.ingredientId,
        },
      });
      await this.lockStock(tx, stock.id);
      const current = await tx.inventoryStock.findUniqueOrThrow({ where: { id: stock.id } });
      if (!outlet.allowNegativeStock && current.availableQuantity.lessThan(quantity)) {
        throw new ConflictException('Insufficient available stock');
      }
      const record = await tx.inventoryWastage.create({
        data: {
          tenantId: outlet.tenantId,
          outletId: dto.outletId,
          ingredientId: dto.ingredientId,
          unitId: ingredient.unitId,
          quantity,
          reason: dto.reason,
          notes: dto.notes?.trim(),
          costAtWastage: Math.round(quantity.toNumber() * ingredient.costPrice),
          recordedByUserId: user.id,
          businessDate: this.businessDate(),
        },
      });
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: {
          availableQuantity: { decrement: quantity },
          damagedQuantity: { increment: quantity },
          lastStockUpdate: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.stockTransaction.create({
        data: {
          tenantId: outlet.tenantId,
          outletId: dto.outletId,
          stockId: stock.id,
          ingredientId: dto.ingredientId,
          transactionType: StockTransactionType.WASTAGE,
          quantity: quantity.negated(),
          unitCost: ingredient.costPrice,
          referenceType: 'INVENTORY_WASTAGE',
          referenceId: record.id,
          notes: dto.notes?.trim(),
          performedByUserId: user.id,
        },
      });
      await this.stock.refreshAlerts(tx, outlet.tenantId, dto.outletId, dto.ingredientId);
      return record;
    });
    return { ...result, quantity: Number(result.quantity) };
  }

  async listWastage(query: RecipeQueryDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.InventoryWastageWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
      };
      const [data, total] = await Promise.all([
        tx.inventoryWastage.findMany({
          where,
          include: { ingredient: { include: { unit: true } } },
          orderBy: { recordedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.inventoryWastage.count({ where }),
      ]);
      return {
        data: data.map((item) => ({ ...item, quantity: Number(item.quantity) })),
        meta: this.pageMeta(query.page, query.limit, total),
      };
    });
  }

  private async resolveRecipe(
    tx: Prisma.TransactionClient,
    tenantId: string,
    menuItemId: string,
    variantId: string | null,
  ) {
    const include = {
      ingredients: {
        include: {
          unit: true,
          ingredient: { include: { unit: true } },
        },
      },
    } satisfies Prisma.RecipeInclude;
    if (variantId) {
      const variantRecipe = await tx.recipe.findFirst({
        where: {
          tenantId,
          menuItemId,
          variantId,
          isActive: true,
          deletedAt: null,
        },
        include,
      });
      if (variantRecipe) return variantRecipe;
    }
    return tx.recipe.findFirst({
      where: {
        tenantId,
        menuItemId,
        variantId: null,
        isActive: true,
        deletedAt: null,
      },
      include,
    });
  }

  private consumptionQuantity(
    quantity: Prisma.Decimal,
    inputFactor: Prisma.Decimal,
    baseFactor: Prisma.Decimal,
    wastagePercentage: Prisma.Decimal,
    yieldQuantity: Prisma.Decimal,
    portionMultiplier: Prisma.Decimal,
    orderQuantity: number,
  ) {
    const normalized = quantity.mul(inputFactor).div(baseFactor);
    const yieldAdjusted = normalized.div(yieldQuantity).mul(portionMultiplier).mul(orderQuantity);
    const retained = new Prisma.Decimal(1).minus(wastagePercentage.div(100));
    return yieldAdjusted.div(retained).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
  }

  private lockStock(tx: Prisma.TransactionClient, stockId: string) {
    return tx.$queryRaw`SELECT "id" FROM "inventory_stocks" WHERE "id" = ${stockId}::uuid FOR UPDATE`;
  }

  private businessDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private mapConsumption(
    item: Prisma.InventoryConsumptionGetPayload<{ include: typeof consumptionInclude }>,
  ) {
    return {
      ...item,
      consumedQuantity: Number(item.consumedQuantity),
      ingredient: {
        ...item.ingredient,
        reorderLevel: Number(item.ingredient.reorderLevel),
        minimumStock: Number(item.ingredient.minimumStock),
        maximumStock: item.ingredient.maximumStock
          ? Number(item.ingredient.maximumStock)
          : null,
        unit: {
          ...item.ingredient.unit,
          conversionFactor: Number(item.ingredient.unit.conversionFactor),
        },
      },
    };
  }

  private pageMeta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }
}
