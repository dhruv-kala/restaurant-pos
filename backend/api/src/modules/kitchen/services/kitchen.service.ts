import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryConsumptionTrigger,
  OrderItemStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { canTransitionOrder } from '../../orders/services/order-lifecycle.util';
import { ConsumptionService } from '../../recipes/services/consumption.service';
import { PerformanceService } from '../../employees/services/performance.service';
import { kitchenSlaStatus } from '../../kds/services/kds-sla.util';
import type { KitchenQueryDto } from '../dto/kitchen-query.dto';
import type { UpdateItemStatusDto } from '../dto/update-item-status.dto';
import type { UpdateKitchenOrderStatusDto } from '../dto/update-order-status.dto';
import { KitchenEvent } from '../enums/kitchen-events';
import {
  requireKitchenRead,
  requireKitchenWrite,
  resolveKitchenScope,
} from './kitchen-access.util';
import { KitchenEventsService } from './kitchen-events.service';

const ticketInclude = {
  table: { select: { id: true, tableNumber: true, displayName: true } },
  waiter: { select: { id: true, displayName: true } },
  items: {
    where: { deletedAt: null },
    include: {
      kitchenStation: true,
      kitchenCategory: true,
      startedBy: { select: { id: true, displayName: true } },
      readiedBy: { select: { id: true, displayName: true } },
      servedBy: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.OrderInclude;

type Ticket = Prisma.OrderGetPayload<{ include: typeof ticketInclude }>;
type TicketItem = Ticket['items'][number];

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: KitchenEventsService,
    private readonly consumption: ConsumptionService,
    private readonly performance: PerformanceService,
  ) {}

  async queue(query: KitchenQueryDto, user: AuthenticatedUser) {
    requireKitchenRead(user);
    const scope = resolveKitchenScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const statuses =
        query.status === undefined
          ? [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]
          : [query.status];
      const tickets = await tx.order.findMany({
        where: {
          status: { in: statuses },
          priority: query.priority,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
          ...(query.search?.trim()
            ? { orderNumber: { contains: query.search.trim(), mode: 'insensitive' } }
            : {}),
          ...(query.stationId === undefined && query.itemStatus === undefined
            ? {}
            : {
                items: {
                  some: {
                    deletedAt: null,
                    kitchenStationId: query.stationId,
                    status: query.itemStatus,
                  },
                },
              }),
        },
        include: ticketInclude,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: query.limit,
      });
      return tickets.map((ticket) => this.toTicket(ticket, query.stationId));
    });
  }

  async metrics(query: KitchenQueryDto, user: AuthenticatedUser) {
    requireKitchenRead(user);
    const scope = resolveKitchenScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const orderScope: Prisma.OrderWhereInput = {
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
      };
      const items = await tx.orderItem.findMany({
        where: {
          deletedAt: null,
          status: { in: [OrderItemStatus.READY, OrderItemStatus.SERVED] },
          kitchenStationId: query.stationId,
          actualPrepMinutes: { not: null },
          readyAt:
            query.fromDate === undefined && query.toDate === undefined
              ? undefined
              : { gte: query.fromDate, lte: query.toDate },
          order: orderScope,
        },
        select: {
          orderId: true,
          actualPrepMinutes: true,
          estimatedPrepMinutes: true,
        },
      });
      const completedOrders = await tx.order.count({
        where: {
          ...orderScope,
          status: OrderStatus.COMPLETED,
          completedAt:
            query.fromDate === undefined && query.toDate === undefined
              ? undefined
              : { gte: query.fromDate, lte: query.toDate },
        },
      });
      const delayed = items.filter(
        (item) => (item.actualPrepMinutes ?? 0) > item.estimatedPrepMinutes,
      );
      return {
        averagePrepTimeMinutes:
          items.length === 0
            ? 0
            : Math.round(
                items.reduce((sum, item) => sum + (item.actualPrepMinutes ?? 0), 0) / items.length,
              ),
        ordersCompleted: completedOrders,
        itemsCompleted: items.length,
        delayedOrders: new Set(delayed.map((item) => item.orderId)).size,
        delayedItems: delayed.length,
      };
    });
  }

  updateItem(id: string, dto: UpdateItemStatusDto, user: AuthenticatedUser) {
    requireKitchenWrite(user);
    const scope = resolveKitchenScope(undefined, undefined, user, false);
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
      if (item === null) throw new NotFoundException('Kitchen item not found');
      this.assertItemTransition(item.status, dto.status);
      const now = new Date();
      await tx.orderItem.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === OrderItemStatus.PREPARING
            ? { startedAt: item.startedAt ?? now, startedByUserId: user.id }
            : {}),
          ...(dto.status === OrderItemStatus.READY
            ? {
                readyAt: now,
                readyByUserId: user.id,
                actualPrepMinutes: this.durationMinutes(item.startedAt, now),
              }
            : {}),
          ...(dto.status === OrderItemStatus.SERVED
            ? { servedAt: now, servedByUserId: user.id }
            : {}),
          version: { increment: 1 },
        },
      });
      const ticket = await this.syncOrder(tx, item.orderId);
      if (ticket.status === OrderStatus.READY) {
        await this.consumption.consumeOrderInTransaction(
          tx,
          ticket.id,
          InventoryConsumptionTrigger.READY,
          user.id,
        );
      }
      if (dto.status === OrderItemStatus.READY) {
        await this.performance.refreshByUserInTransaction(
          tx,
          ticket.tenantId,
          user.id,
          ticket.businessDate,
        );
      }
      this.publish(ticket, item.id, item.kitchenStationId, dto.status);
      return this.toTicket(ticket);
    });
  }

  updateOrder(id: string, dto: UpdateKitchenOrderStatusDto, user: AuthenticatedUser) {
    requireKitchenWrite(user);
    const scope = resolveKitchenScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const order = await tx.order.findFirst({
        where: {
          id,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: ticketInclude,
      });
      if (order === null) throw new NotFoundException('Order not found');
      if (dto.status === OrderStatus.COMPLETED) {
        if (order.status !== OrderStatus.SERVED) {
          throw new ConflictException('Only served orders can be completed');
        }
        const completed = await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.COMPLETED,
            completedAt: new Date(),
            version: { increment: 1 },
          },
          include: ticketInclude,
        });
        await this.consumption.consumeOrderInTransaction(
          tx,
          completed.id,
          InventoryConsumptionTrigger.COMPLETED,
          user.id,
        );
        this.publishOrder(completed);
        return this.toTicket(completed);
      }
      const target = this.itemStatusForOrder(dto.status);
      this.assertBulkTransition(order, target);
      const now = new Date();
      for (const item of order.items.filter((candidate) => candidate.status !== target)) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            status: target,
            ...(target === OrderItemStatus.PREPARING
              ? { startedAt: item.startedAt ?? now, startedByUserId: user.id }
              : {}),
            ...(target === OrderItemStatus.READY
              ? {
                  readyAt: now,
                  readyByUserId: user.id,
                  actualPrepMinutes: this.durationMinutes(item.startedAt, now),
                }
              : {}),
            ...(target === OrderItemStatus.SERVED
              ? { servedAt: now, servedByUserId: user.id }
              : {}),
            version: { increment: 1 },
          },
        });
      }
      const ticket = await this.syncOrder(tx, id);
      if (ticket.status === OrderStatus.READY) {
        await this.consumption.consumeOrderInTransaction(
          tx,
          ticket.id,
          InventoryConsumptionTrigger.READY,
          user.id,
        );
      }
      this.publishOrder(ticket);
      return this.toTicket(ticket);
    });
  }

  private assertBulkTransition(order: Ticket, target: OrderItemStatus): void {
    const allowed =
      target === OrderItemStatus.PREPARING
        ? order.items.every((item) => item.status === OrderItemStatus.PENDING)
        : target === OrderItemStatus.READY
          ? order.items.every(
              (item) =>
                item.status === OrderItemStatus.PREPARING || item.status === OrderItemStatus.READY,
            )
          : order.items.every(
              (item) =>
                item.status === OrderItemStatus.READY || item.status === OrderItemStatus.SERVED,
            );
    if (!allowed) throw new ConflictException('Order items are not ready for this transition');
  }

  private itemStatusForOrder(status: OrderStatus): OrderItemStatus {
    if (status === OrderStatus.PREPARING) return OrderItemStatus.PREPARING;
    if (status === OrderStatus.READY) return OrderItemStatus.READY;
    if (status === OrderStatus.SERVED) return OrderItemStatus.SERVED;
    throw new ConflictException('Unsupported kitchen order transition');
  }

  private async syncOrder(tx: Prisma.TransactionClient, orderId: string): Promise<Ticket> {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: ticketInclude,
    });
    const statuses = order.items.map((item) => item.status);
    let next = order.status;
    if (statuses.every((status) => status === OrderItemStatus.SERVED)) {
      next = OrderStatus.SERVED;
    } else if (
      statuses.every(
        (status) =>
          status === OrderItemStatus.READY ||
          status === OrderItemStatus.SERVED ||
          status === OrderItemStatus.CANCELLED,
      )
    ) {
      next = OrderStatus.READY;
    } else if (statuses.some((status) => status === OrderItemStatus.PREPARING)) {
      next = OrderStatus.PREPARING;
    }
    if (next === order.status) return order;
    let current = order.status;
    if (current === OrderStatus.PENDING && next === OrderStatus.PREPARING) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.ACCEPTED, version: { increment: 1 } },
      });
      current = OrderStatus.ACCEPTED;
    }
    if (!canTransitionOrder(current, next)) {
      throw new ConflictException('Invalid aggregate order transition');
    }
    return tx.order.update({
      where: { id: orderId },
      data: { status: next, version: { increment: 1 } },
      include: ticketInclude,
    });
  }

  private assertItemTransition(current: OrderItemStatus, next: OrderItemStatus): void {
    const valid =
      (current === OrderItemStatus.PENDING && next === OrderItemStatus.PREPARING) ||
      (current === OrderItemStatus.PREPARING && next === OrderItemStatus.READY) ||
      (current === OrderItemStatus.READY && next === OrderItemStatus.SERVED);
    if (!valid) throw new ConflictException(`Cannot change ${current} item to ${next}`);
  }

  private durationMinutes(startedAt: Date | null, end: Date): number {
    if (startedAt === null) return 0;
    return Math.max(0, Math.ceil((end.getTime() - startedAt.getTime()) / 60_000));
  }

  private toTicket(ticket: Ticket, stationId?: string) {
    const now = new Date();
    const items = ticket.items
      .filter((item) => stationId === undefined || item.kitchenStationId === stationId)
      .map((item) => this.toItem(item, now));
    return {
      ...ticket,
      elapsedMinutes: this.durationMinutes(ticket.createdAt, now),
      items,
    };
  }

  private toItem(item: TicketItem, now: Date) {
    const end = item.readyAt ?? now;
    const elapsed =
      item.actualPrepMinutes ?? this.durationMinutes(item.startedAt ?? item.firedAt, end);
    return {
      ...item,
      taxPercentage: item.taxPercentage.toNumber(),
      elapsedMinutes: elapsed,
      remainingMinutes: Math.max(0, item.estimatedPrepMinutes - elapsed),
      slaStatus: kitchenSlaStatus(item.estimatedPrepMinutes, elapsed),
    };
  }

  private publish(
    ticket: Ticket,
    itemId: string,
    stationId: string | null,
    status: OrderItemStatus,
  ): void {
    if (status === OrderItemStatus.READY || status === OrderItemStatus.SERVED) {
      this.events.publish({
        type: status === OrderItemStatus.READY ? KitchenEvent.itemReady : KitchenEvent.itemServed,
        tenantId: ticket.tenantId,
        outletId: ticket.outletId,
        stationId: stationId ?? undefined,
        orderId: ticket.id,
        itemId,
      });
    }
    this.publishOrder(ticket, stationId ?? undefined);
  }

  private publishOrder(ticket: Ticket, stationId?: string): void {
    const type =
      ticket.status === OrderStatus.READY
        ? KitchenEvent.orderReady
        : ticket.status === OrderStatus.SERVED
          ? KitchenEvent.orderServed
          : KitchenEvent.orderUpdated;
    this.events.publish({
      type,
      tenantId: ticket.tenantId,
      outletId: ticket.outletId,
      stationId,
      orderId: ticket.id,
    });
    this.events.publish({
      type: KitchenEvent.queueUpdated,
      tenantId: ticket.tenantId,
      outletId: ticket.outletId,
      stationId,
    });
  }
}
