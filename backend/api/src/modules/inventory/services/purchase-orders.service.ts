import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../dto/create-po.dto';
import type { InventoryQueryDto } from '../dto/inventory-query.dto';
import { InventoryEvent } from '../enums/inventory-events';
import {
  requireInventoryRead,
  requireInventoryWrite,
  resolveInventoryScope,
} from './inventory-access.util';
import { InventoryEventsService } from './inventory-events.service';
import { decimal, pageMeta } from './inventory-response.util';
import { StockService } from './stock.service';

const include = {
  vendor: true,
  items: {
    include: { ingredient: { include: { unit: true } } },
    orderBy: { ingredient: { name: 'asc' as const } },
  },
} satisfies Prisma.PurchaseOrderInclude;
type PurchaseOrderRecord = Prisma.PurchaseOrderGetPayload<{ include: typeof include }>;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly events: InventoryEventsService,
  ) {}

  async create(dto: CreatePurchaseOrderDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const scope = resolveInventoryScope(dto.tenantId, dto.outletId, user, true);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const tenantId = await this.references(tx, scope.tenantId, dto);
      const totals = this.totals(dto);
      const poNumber = await this.nextNumber(tx, tenantId, dto.outletId, dto.orderDate);
      const order = await tx.purchaseOrder.create({
        data: {
          tenantId,
          outletId: dto.outletId,
          vendorId: dto.vendorId,
          poNumber,
          orderDate: new Date(dto.orderDate),
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
          subtotal: totals.subtotal,
          taxAmount: dto.taxAmount,
          grandTotal: totals.subtotal + dto.taxAmount,
          notes: dto.notes?.trim(),
          createdByUserId: user.id,
          updatedByUserId: user.id,
          items: {
            create: dto.items.map((item) => ({
              tenantId,
              outletId: dto.outletId,
              ingredientId: item.ingredientId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: Math.round(item.quantity * item.unitCost),
            })),
          },
        },
        include,
      });
      return this.map(order);
    });
  }

  async findAll(query: InventoryQueryDto, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.PurchaseOrderWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        ...(query.vendorId ? { vendorId: query.vendorId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? { poNumber: { contains: query.search.trim(), mode: 'insensitive' } }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.purchaseOrder.findMany({
          where,
          include,
          orderBy: { orderDate: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.purchaseOrder.count({ where }),
      ]);
      return { data: data.map((order) => this.map(order)), meta: pageMeta(query.page, query.limit, total) };
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const order = await tx.purchaseOrder.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include,
      });
      if (!order) throw new NotFoundException('Purchase order not found');
      return this.map(order);
    });
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const scope = resolveInventoryScope(dto.tenantId, dto.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const existing = await tx.purchaseOrder.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include,
      });
      if (!existing) throw new NotFoundException('Purchase order not found');
      if (
        existing.status === PurchaseOrderStatus.RECEIVED ||
        existing.status === PurchaseOrderStatus.CANCELLED
      ) {
        throw new ConflictException('Finalized purchase orders cannot be edited');
      }
      if (dto.outletId !== undefined && dto.outletId !== existing.outletId) {
        throw new ConflictException('Purchase order outlet cannot be changed');
      }
      this.assertTransition(existing.status, dto.status);
      const merged: CreatePurchaseOrderDto = {
        tenantId: existing.tenantId,
        outletId: existing.outletId,
        vendorId: dto.vendorId ?? existing.vendorId,
        orderDate: dto.orderDate ?? existing.orderDate.toISOString(),
        expectedDate:
          dto.expectedDate ??
          (existing.expectedDate ? existing.expectedDate.toISOString() : undefined),
        taxAmount: dto.taxAmount ?? existing.taxAmount,
        notes: dto.notes ?? existing.notes ?? undefined,
        items:
          dto.items ??
          existing.items.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: decimal(item.quantity),
            unitCost: item.unitCost,
          })),
      };
      await this.references(tx, existing.tenantId, merged);
      const totals = this.totals(merged);
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({
          where: { tenantId: existing.tenantId, purchaseOrderId: id },
        });
      }
      const order = await tx.purchaseOrder.update({
        where: { id },
        data: {
          vendorId: dto.vendorId,
          status: dto.status,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
          subtotal: totals.subtotal,
          taxAmount: merged.taxAmount,
          grandTotal: totals.subtotal + merged.taxAmount,
          notes: dto.notes?.trim(),
          updatedByUserId: user.id,
          version: { increment: 1 },
          items: dto.items
            ? {
                create: dto.items.map((item) => ({
                  tenantId: existing.tenantId,
                  outletId: existing.outletId,
                  ingredientId: item.ingredientId,
                  quantity: item.quantity,
                  unitCost: item.unitCost,
                  lineTotal: Math.round(item.quantity * item.unitCost),
                })),
              }
            : undefined,
        },
        include,
      });
      return this.map(order);
    });
  }

  async receive(id: string, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const scope = resolveInventoryScope(undefined, undefined, user, false);
    const order = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      await tx.$queryRaw`SELECT "id" FROM "purchase_orders" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const existing = await tx.purchaseOrder.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include,
      });
      if (!existing) throw new NotFoundException('Purchase order not found');
      if (
        existing.status !== PurchaseOrderStatus.APPROVED &&
        existing.status !== PurchaseOrderStatus.PENDING
      ) {
        throw new ConflictException('Only pending or approved purchase orders can be received');
      }
      for (const item of existing.items) {
        await this.stock.applyMovement(tx, {
          tenantId: existing.tenantId,
          outletId: existing.outletId,
          ingredientId: item.ingredientId,
          quantity: decimal(item.quantity),
          unitCost: item.unitCost,
          referenceId: existing.id,
          userId: user.id,
        });
      }
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseOrderStatus.RECEIVED,
          receivedByUserId: user.id,
          receivedAt: new Date(),
          updatedByUserId: user.id,
          version: { increment: 1 },
        },
        include,
      });
    });
    this.events.publish({
      type: InventoryEvent.purchaseOrderReceived,
      tenantId: order.tenantId,
      outletId: order.outletId,
      referenceId: order.id,
      occurredAt: new Date().toISOString(),
    });
    return this.map(order);
  }

  private async references(
    tx: Prisma.TransactionClient,
    requestedTenantId: string | undefined,
    dto: CreatePurchaseOrderDto,
  ) {
    const outlet = await tx.outlet.findFirst({
      where: {
        id: dto.outletId,
        deletedAt: null,
        ...(requestedTenantId ? { tenantId: requestedTenantId } : {}),
      },
      select: { tenantId: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    const [vendor, ingredients] = await Promise.all([
      tx.vendor.count({
        where: { id: dto.vendorId, tenantId: outlet.tenantId, deletedAt: null, isActive: true },
      }),
      tx.ingredient.count({
        where: {
          id: { in: dto.items.map((item) => item.ingredientId) },
          tenantId: outlet.tenantId,
          deletedAt: null,
          isActive: true,
        },
      }),
    ]);
    if (vendor !== 1 || ingredients !== new Set(dto.items.map((item) => item.ingredientId)).size) {
      throw new BadRequestException('Vendor and ingredients must belong to the tenant');
    }
    if (new Set(dto.items.map((item) => item.ingredientId)).size !== dto.items.length) {
      throw new BadRequestException('Duplicate purchase order ingredients are not allowed');
    }
    if (dto.expectedDate && new Date(dto.expectedDate) < new Date(dto.orderDate)) {
      throw new BadRequestException('Expected date cannot precede order date');
    }
    return outlet.tenantId;
  }

  private totals(dto: CreatePurchaseOrderDto) {
    return {
      subtotal: dto.items.reduce(
        (sum, item) => sum + Math.round(item.quantity * item.unitCost),
        0,
      ),
    };
  }

  private async nextNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    dateText: string,
  ) {
    const businessDate = new Date(dateText);
    const counter = await tx.purchaseOrderNumberCounter.upsert({
      where: { tenantId_outletId_businessDate: { tenantId, outletId, businessDate } },
      update: { lastNumber: { increment: 1 } },
      create: { tenantId, outletId, businessDate, lastNumber: 1 },
    });
    const stamp = dateText.slice(0, 10).replaceAll('-', '');
    return `PO-${stamp}-${counter.lastNumber.toString().padStart(5, '0')}`;
  }

  private assertTransition(current: PurchaseOrderStatus, next?: PurchaseOrderStatus) {
    if (!next || next === current) return;
    const allowed: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
      DRAFT: [PurchaseOrderStatus.PENDING, PurchaseOrderStatus.CANCELLED],
      PENDING: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.CANCELLED],
      APPROVED: [PurchaseOrderStatus.CANCELLED],
      RECEIVED: [],
      CANCELLED: [],
    };
    if (!allowed[current].includes(next)) {
      throw new ConflictException(`Cannot transition purchase order from ${current} to ${next}`);
    }
  }

  private map(order: PurchaseOrderRecord) {
    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        quantity: decimal(item.quantity),
        ingredient: {
          ...item.ingredient,
          reorderLevel: decimal(item.ingredient.reorderLevel),
          minimumStock: decimal(item.ingredient.minimumStock),
          maximumStock: item.ingredient.maximumStock
            ? decimal(item.ingredient.maximumStock)
            : null,
          unit: {
            ...item.ingredient.unit,
            conversionFactor: decimal(item.ingredient.unit.conversionFactor),
          },
        },
      })),
    };
  }
}
