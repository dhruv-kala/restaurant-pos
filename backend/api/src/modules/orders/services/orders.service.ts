import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiningTableStatus, OrderItemStatus, OrderStatus, OrderType, Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AddOrderItemDto } from '../dto/add-order-item.dto';
import type { CancelOrderDto } from '../dto/cancel-order.dto';
import type { CreateOrderDto } from '../dto/create-order.dto';
import type { OrderQueryDto } from '../dto/order-query.dto';
import type { OrderListResponseDto, OrderResponseDto } from '../dto/order-response.dto';
import type { TransferOrderDto } from '../dto/transfer-order.dto';
import type { UpdateOrderItemDto } from '../dto/update-order-item.dto';
import type { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import type { UpdateOrderDto } from '../dto/update-order.dto';
import {
  requireOrderRead,
  requireOrderStatusWrite,
  requireOrderWrite,
  resolveOrderScope,
} from './order-access.util';
import { OrderEventsService } from './order-events.service';
import { canTransitionOrder } from './order-lifecycle.util';

const orderInclude = {
  items: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  },
  table: {
    select: { id: true, tableNumber: true, displayName: true },
  },
  waiter: {
    select: { id: true, displayName: true, email: true },
  },
} satisfies Prisma.OrderInclude;

type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type OrderItemDraft = {
  menuItemId: string;
  variantId?: string;
  kitchenCategoryId?: string;
  kitchenStationId?: string;
  itemName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  taxPercentage: Prisma.Decimal;
  specialInstructions?: string;
  firedAt: Date;
  estimatedPrepMinutes: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrderEventsService,
  ) {}

  async create(dto: CreateOrderDto, user: AuthenticatedUser): Promise<OrderResponseDto> {
    requireOrderWrite(user);
    const scope = resolveOrderScope(dto.tenantId, dto.outletId, user, true);
    this.assertTypeRequirements(dto.orderType, dto.tableId, dto.customerId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const outlet = await tx.outlet.findFirst({
        where: {
          id: scope.outletId,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        },
        select: { id: true, tenantId: true, tenant: { select: { currencyCode: true } } },
      });
      if (outlet === null) throw new BadRequestException('Outlet is not accessible');
      if (dto.tableId !== undefined) {
        await this.requireAvailableTable(tx, outlet.tenantId, outlet.id, dto.tableId, true);
      }
      await this.assertWaiter(tx, outlet.tenantId, outlet.id, dto.waiterId);
      const orderNumber = await this.nextOrderNumber(tx, outlet.tenantId, outlet.id);
      const itemData = await Promise.all(
        dto.items.map((item) => this.buildItem(tx, outlet.tenantId, outlet.id, item)),
      );
      const totals = this.calculateTotals(itemData);
      const order = await tx.order.create({
        data: {
          tenantId: outlet.tenantId,
          outletId: outlet.id,
          tableId: dto.tableId,
          customerId: dto.customerId,
          orderNumber,
          orderType: dto.orderType,
          priority: dto.priority,
          waiterId: dto.waiterId ?? (user.outletId === outlet.id ? user.id : undefined),
          guestCount: dto.guestCount ?? 1,
          notes: dto.notes?.trim(),
          currencyCode: outlet.tenant.currencyCode,
          estimatedCompletionTime: this.estimatedCompletionTime(itemData),
          ...totals,
          items: { create: itemData },
        },
        include: orderInclude,
      });
      if (dto.tableId !== undefined) {
        await tx.diningTable.update({
          where: { id: dto.tableId },
          data: { status: DiningTableStatus.OCCUPIED, version: { increment: 1 } },
        });
      }
      this.events.publishCreated({
        type: 'OrderCreated',
        tenantId: order.tenantId,
        outletId: order.outletId,
        orderId: order.id,
      });
      return this.toResponse(order);
    });
  }

  async findAll(query: OrderQueryDto, user: AuthenticatedUser): Promise<OrderListResponseDto> {
    requireOrderRead(user);
    const scope = resolveOrderScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.OrderWhereInput = {
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        status: query.status,
        orderType: query.orderType,
        tableId: query.tableId,
        waiterId: query.waiterId,
        customerId: query.customerId,
        createdAt:
          query.fromDate === undefined && query.toDate === undefined
            ? undefined
            : { gte: query.fromDate, lte: query.toDate },
        ...(query.search?.trim()
          ? { orderNumber: { contains: query.search.trim(), mode: 'insensitive' } }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.order.findMany({
          where,
          include: orderInclude,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.order.count({ where }),
      ]);
      return {
        data: data.map((order) => this.toResponse(order)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async kitchenQueue(user: AuthenticatedUser): Promise<OrderResponseDto[]> {
    requireOrderRead(user);
    const scope = resolveOrderScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const orders = await tx.order.findMany({
        where: {
          status: { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING] },
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: orderInclude,
        orderBy: { createdAt: 'asc' },
      });
      return orders.map((order) => this.toResponse(order));
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<OrderResponseDto> {
    requireOrderRead(user);
    return this.withOrder(id, user, (_tx, order) => Promise.resolve(this.toResponse(order)));
  }

  async update(
    id: string,
    dto: UpdateOrderDto,
    user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    requireOrderWrite(user);
    return this.withOrder(id, user, async (tx, order) => {
      this.assertMutable(order);
      await this.assertWaiter(tx, order.tenantId, order.outletId, dto.waiterId);
      const updated = await tx.order.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          waiterId: dto.waiterId,
          guestCount: dto.guestCount,
          notes: dto.notes?.trim(),
          version: { increment: 1 },
        },
        include: orderInclude,
      });
      this.publishUpdated(updated);
      return this.toResponse(updated);
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    requireOrderStatusWrite(user);
    if (dto.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Use the cancel endpoint with a reason');
    }
    return this.withOrder(id, user, async (tx, order) => {
      if (!canTransitionOrder(order.status, dto.status)) {
        throw new ConflictException(`Cannot change ${order.status} order to ${dto.status}`);
      }
      const itemStatus = this.itemStatusFor(dto.status);
      if (itemStatus !== undefined) {
        await tx.orderItem.updateMany({
          where: { tenantId: order.tenantId, orderId: id, deletedAt: null },
          data: { status: itemStatus, version: { increment: 1 } },
        });
      }
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: dto.status,
          completedAt: dto.status === OrderStatus.COMPLETED ? new Date() : undefined,
          version: { increment: 1 },
        },
        include: orderInclude,
      });
      if (dto.status === OrderStatus.COMPLETED && order.tableId !== null) {
        await this.setTableStatus(tx, order.tableId, DiningTableStatus.CLEANING);
      }
      this.events.publishStatusChanged({
        type: 'OrderStatusChanged',
        tenantId: updated.tenantId,
        outletId: updated.outletId,
        orderId: updated.id,
        status: updated.status,
      });
      return this.toResponse(updated);
    });
  }

  async cancel(id: string, dto: CancelOrderDto, user: AuthenticatedUser) {
    requireOrderWrite(user);
    return this.withOrder(id, user, async (tx, order) => {
      if (order.status === OrderStatus.COMPLETED) {
        throw new ConflictException('Completed orders cannot be cancelled');
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new ConflictException('Order is already cancelled');
      }
      await tx.orderItem.updateMany({
        where: { tenantId: order.tenantId, orderId: id, deletedAt: null },
        data: { status: OrderItemStatus.CANCELLED, version: { increment: 1 } },
      });
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationReason: dto.reason.trim(),
          cancelledAt: new Date(),
          version: { increment: 1 },
        },
        include: orderInclude,
      });
      if (order.tableId !== null) {
        await this.setTableStatus(tx, order.tableId, DiningTableStatus.AVAILABLE);
      }
      this.events.publishStatusChanged({
        type: 'OrderStatusChanged',
        tenantId: updated.tenantId,
        outletId: updated.outletId,
        orderId: updated.id,
        status: updated.status,
      });
      return this.toResponse(updated);
    });
  }

  async addItem(id: string, dto: AddOrderItemDto, user: AuthenticatedUser) {
    requireOrderWrite(user);
    return this.withOrder(id, user, async (tx, order) => {
      this.assertMutable(order);
      const item = await this.buildItem(tx, order.tenantId, order.outletId, dto);
      await tx.orderItem.create({ data: { ...item, tenantId: order.tenantId, orderId: id } });
      return this.recalculate(tx, id, order);
    });
  }

  async updateItem(id: string, dto: UpdateOrderItemDto, user: AuthenticatedUser) {
    requireOrderWrite(user);
    return this.withItem(id, user, async (tx, item, order) => {
      this.assertMutable(order);
      const quantity = dto.quantity ?? item.quantity;
      const base = item.unitPrice * quantity - item.discountAmount;
      const taxAmount = Math.round((base * item.taxPercentage.toNumber()) / 100);
      await tx.orderItem.update({
        where: { id },
        data: {
          quantity,
          specialInstructions: dto.specialInstructions?.trim(),
          taxAmount,
          lineTotal: base + taxAmount,
          version: { increment: 1 },
        },
      });
      return this.recalculate(tx, order.id, order);
    });
  }

  async removeItem(id: string, user: AuthenticatedUser) {
    requireOrderWrite(user);
    return this.withItem(id, user, async (tx, item, order) => {
      this.assertMutable(order);
      if (order.items.length <= 1) {
        throw new ConflictException('An order must contain at least one item');
      }
      await tx.orderItem.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: OrderItemStatus.CANCELLED,
          version: { increment: 1 },
        },
      });
      return this.recalculate(tx, item.orderId, order);
    });
  }

  async transfer(id: string, dto: TransferOrderDto, user: AuthenticatedUser) {
    requireOrderWrite(user);
    return this.withOrder(id, user, async (tx, order) => {
      this.assertMutable(order);
      if (order.orderType !== OrderType.DINE_IN || order.tableId === null) {
        throw new ConflictException('Only dine-in orders can be transferred');
      }
      if (order.tableId === dto.targetTableId) {
        throw new BadRequestException('Target table must be different');
      }
      await this.requireAvailableTable(tx, order.tenantId, order.outletId, dto.targetTableId);
      await this.setTableStatus(tx, order.tableId, DiningTableStatus.AVAILABLE);
      await this.setTableStatus(tx, dto.targetTableId, DiningTableStatus.OCCUPIED);
      const updated = await tx.order.update({
        where: { id },
        data: { tableId: dto.targetTableId, version: { increment: 1 } },
        include: orderInclude,
      });
      this.publishUpdated(updated);
      return this.toResponse(updated);
    });
  }

  private async buildItem(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    dto: AddOrderItemDto,
  ): Promise<OrderItemDraft> {
    const item = await tx.menuItem.findFirst({
      where: { id: dto.menuItemId, tenantId, isAvailable: true, deletedAt: null },
      include: {
        variants: { where: { deletedAt: null } },
        outletPrices: { where: { outletId, deletedAt: null } },
        kitchenCategory: true,
        stationAssignments: {
          where: { outletId, kitchenStation: { isActive: true, deletedAt: null } },
          include: { kitchenStation: true },
          orderBy: { kitchenStation: { displayOrder: 'asc' } },
          take: 1,
        },
      },
    });
    if (item === null) throw new BadRequestException('Menu item is unavailable');
    const variant =
      dto.variantId === undefined
        ? undefined
        : item.variants.find(({ id }) => id === dto.variantId);
    if (dto.variantId !== undefined && variant === undefined) {
      throw new BadRequestException('Variant does not belong to the menu item');
    }
    const unitPrice = (item.outletPrices[0]?.price ?? item.price) + (variant?.priceAdjustment ?? 0);
    if (unitPrice < 0) throw new ConflictException('Calculated item price cannot be negative');
    const subtotal = unitPrice * dto.quantity;
    const taxAmount = Math.round((subtotal * item.taxPercentage.toNumber()) / 100);
    const kitchenCategory =
      item.kitchenCategory?.outletId === outletId &&
      item.kitchenCategory.isActive &&
      item.kitchenCategory.deletedAt === null
        ? item.kitchenCategory
        : undefined;
    return {
      menuItemId: item.id,
      variantId: variant?.id,
      kitchenCategoryId: kitchenCategory?.id,
      kitchenStationId: item.stationAssignments[0]?.kitchenStationId,
      itemName: item.name,
      variantName: variant?.name,
      quantity: dto.quantity,
      unitPrice,
      discountAmount: 0,
      taxAmount,
      lineTotal: subtotal + taxAmount,
      taxPercentage: item.taxPercentage,
      specialInstructions: dto.specialInstructions?.trim(),
      firedAt: new Date(),
      estimatedPrepMinutes: 15,
    };
  }

  private estimatedCompletionTime(items: OrderItemDraft[]): Date {
    const minutes = Math.max(...items.map(({ estimatedPrepMinutes }) => estimatedPrepMinutes));
    return new Date(Date.now() + minutes * 60_000);
  }

  private calculateTotals(
    items: Array<{
      unitPrice: number;
      quantity: number;
      discountAmount: number;
      taxAmount: number;
    }>,
  ) {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = items.reduce((sum, item) => sum + (item.discountAmount ?? 0), 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0);
    const serviceChargeAmount = 0;
    return {
      subtotal,
      discountAmount,
      taxAmount,
      serviceChargeAmount,
      grandTotal: subtotal - discountAmount + taxAmount + serviceChargeAmount,
    };
  }

  private async recalculate(
    tx: Prisma.TransactionClient,
    id: string,
    existing: OrderRecord,
  ): Promise<OrderResponseDto> {
    const items = await tx.orderItem.findMany({
      where: { tenantId: existing.tenantId, orderId: id, deletedAt: null },
    });
    const totals = this.calculateTotals(items);
    const updated = await tx.order.update({
      where: { id },
      data: { ...totals, version: { increment: 1 } },
      include: orderInclude,
    });
    this.publishUpdated(updated);
    return this.toResponse(updated);
  }

  private async nextOrderNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
  ): Promise<string> {
    const now = new Date();
    const businessDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const counter = await tx.orderNumberCounter.upsert({
      where: { tenantId_outletId_businessDate: { tenantId, outletId, businessDate } },
      create: { tenantId, outletId, businessDate, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
      select: { lastNumber: true },
    });
    const date = businessDate.toISOString().slice(0, 10).replaceAll('-', '');
    return `ORD-${date}-${counter.lastNumber.toString().padStart(5, '0')}`;
  }

  private assertTypeRequirements(type: OrderType, tableId?: string, customerId?: string): void {
    if (type === OrderType.DINE_IN && tableId === undefined) {
      throw new BadRequestException('Dine-in orders require tableId');
    }
    if (type !== OrderType.DINE_IN && tableId !== undefined) {
      throw new BadRequestException('Only dine-in orders can use a table');
    }
    if (type === OrderType.DELIVERY && customerId === undefined) {
      throw new BadRequestException('Delivery orders require customerId');
    }
  }

  private assertMutable(order: OrderRecord): void {
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('Completed or cancelled orders cannot be edited');
    }
  }

  private async assertWaiter(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    waiterId?: string,
  ): Promise<void> {
    if (waiterId === undefined) return;
    const membership = await tx.tenantMembership.findFirst({
      where: {
        tenantId,
        userId: waiterId,
        status: 'ACTIVE',
        outletAssignments: { some: { outletId, revokedAt: null } },
      },
      select: { id: true },
    });
    if (membership === null) throw new BadRequestException('Waiter is not assigned to this outlet');
  }

  private async requireAvailableTable(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    tableId: string,
    allowReserved = false,
  ): Promise<void> {
    const table = await tx.diningTable.findFirst({
      where: {
        id: tableId,
        tenantId,
        outletId,
        isActive: true,
        deletedAt: null,
        status: allowReserved
          ? { in: [DiningTableStatus.AVAILABLE, DiningTableStatus.RESERVED] }
          : DiningTableStatus.AVAILABLE,
      },
      select: { id: true },
    });
    if (table === null) throw new ConflictException('Table is not available');
  }

  private setTableStatus(tx: Prisma.TransactionClient, tableId: string, status: DiningTableStatus) {
    return tx.diningTable.update({
      where: { id: tableId },
      data: { status, version: { increment: 1 } },
    });
  }

  private itemStatusFor(status: OrderStatus): OrderItemStatus | undefined {
    switch (status) {
      case OrderStatus.PREPARING:
        return OrderItemStatus.PREPARING;
      case OrderStatus.READY:
        return OrderItemStatus.READY;
      case OrderStatus.SERVED:
      case OrderStatus.COMPLETED:
        return OrderItemStatus.SERVED;
      default:
        return undefined;
    }
  }

  private async withOrder<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (tx: Prisma.TransactionClient, order: OrderRecord) => Promise<T>,
  ): Promise<T> {
    const scope = resolveOrderScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const order = await tx.order.findFirst({
        where: {
          id,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: orderInclude,
      });
      if (order === null) throw new NotFoundException('Order not found');
      return operation(tx, order);
    });
  }

  private async withItem<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (
      tx: Prisma.TransactionClient,
      item: Prisma.OrderItemGetPayload<object>,
      order: OrderRecord,
    ) => Promise<T>,
  ): Promise<T> {
    const scope = resolveOrderScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const item = await tx.orderItem.findFirst({
        where: {
          id,
          deletedAt: null,
          order: {
            ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
            ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
          },
        },
      });
      if (item === null) throw new NotFoundException('Order item not found');
      const order = await tx.order.findUniqueOrThrow({
        where: { id: item.orderId },
        include: orderInclude,
      });
      return operation(tx, item, order);
    });
  }

  private publishUpdated(order: OrderRecord): void {
    this.events.publishUpdated({
      type: 'OrderUpdated',
      tenantId: order.tenantId,
      outletId: order.outletId,
      orderId: order.id,
    });
  }

  private toResponse(order: OrderRecord): OrderResponseDto {
    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        taxPercentage: item.taxPercentage.toNumber(),
      })),
    };
  }
}
