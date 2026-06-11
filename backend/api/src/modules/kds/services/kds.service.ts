import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderItemStatus, OrderStatus, Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { canTransitionOrder } from '../../orders/services/order-lifecycle.util';
import type {
  CreateKitchenCategoryDto,
  UpdateKitchenCategoryDto,
} from '../dto/kitchen-category.dto';
import type { KitchenQueueQueryDto } from '../dto/kitchen-queue-query.dto';
import type { StartItemDto } from '../dto/start-item.dto';
import { KdsEventsService } from '../events/kds-events.service';
import {
  requireKdsConfigure,
  requireKdsRead,
  requireKdsWrite,
  resolveKdsScope,
} from './kds-access.util';
import { kitchenSlaStatus } from './kds-sla.util';

const ticketInclude = {
  table: { select: { id: true, tableNumber: true, displayName: true } },
  waiter: { select: { id: true, displayName: true } },
  items: {
    where: { deletedAt: null },
    include: { kitchenCategory: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.OrderInclude;

type Ticket = Prisma.OrderGetPayload<{ include: typeof ticketInclude }>;

@Injectable()
export class KdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: KdsEventsService,
  ) {}

  async queue(query: KitchenQueueQueryDto, user: AuthenticatedUser) {
    requireKdsRead(user);
    if (
      user.roles.includes('WAITER') &&
      query.status !== undefined &&
      query.status !== OrderStatus.READY
    ) {
      throw new ForbiddenException('Waiters may only view ready orders');
    }
    const statuses = user.roles.includes('WAITER')
      ? [OrderStatus.READY]
      : query.status === undefined
        ? [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]
        : [query.status];
    return this.findTickets(query, statuses, user);
  }

  active(query: KitchenQueueQueryDto, user: AuthenticatedUser) {
    requireKdsRead(user);
    if (user.roles.includes('WAITER')) {
      throw new ForbiddenException('Waiters may only view ready orders');
    }
    return this.findTickets(
      query,
      [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING],
      user,
    );
  }

  ready(query: KitchenQueueQueryDto, user: AuthenticatedUser) {
    requireKdsRead(user);
    return this.findTickets(query, [OrderStatus.READY], user);
  }

  completed(query: KitchenQueueQueryDto, user: AuthenticatedUser) {
    requireKdsRead(user);
    if (user.roles.includes('WAITER')) {
      throw new ForbiddenException('Waiters may only view ready orders');
    }
    return this.findTickets(query, [OrderStatus.SERVED, OrderStatus.COMPLETED], user);
  }

  async startItem(id: string, dto: StartItemDto, user: AuthenticatedUser) {
    return this.updateItem(id, OrderItemStatus.PREPARING, user, (now, item) => ({
      startedAt: item.startedAt ?? now,
      estimatedPrepMinutes: dto.estimatedPrepMinutes ?? item.estimatedPrepMinutes,
    }));
  }

  readyItem(id: string, user: AuthenticatedUser) {
    return this.updateItem(id, OrderItemStatus.READY, user, (now, item) => ({
      readyAt: now,
      actualPrepMinutes: this.durationMinutes(item.startedAt, now),
    }));
  }

  servedItem(id: string, user: AuthenticatedUser) {
    return this.updateItem(id, OrderItemStatus.SERVED, user, (now) => ({
      servedAt: now,
    }));
  }

  startOrder(id: string, user: AuthenticatedUser) {
    return this.bulkUpdate(id, OrderItemStatus.PREPARING, user);
  }

  readyOrder(id: string, user: AuthenticatedUser) {
    return this.bulkUpdate(id, OrderItemStatus.READY, user);
  }

  async categories(query: KitchenQueueQueryDto, user: AuthenticatedUser) {
    requireKdsRead(user);
    const scope = resolveKdsScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      return tx.kitchenCategory.findMany({
        where: {
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });
    });
  }

  async createCategory(dto: CreateKitchenCategoryDto, user: AuthenticatedUser) {
    requireKdsConfigure(user);
    const scope = resolveKdsScope(dto.tenantId, dto.outletId, user, true);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const outlet = await tx.outlet.findFirst({
        where: {
          id: scope.outletId,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        },
        select: { tenantId: true },
      });
      if (outlet === null) throw new NotFoundException('Outlet not found');
      return tx.kitchenCategory.create({
        data: {
          tenantId: outlet.tenantId,
          outletId: dto.outletId,
          name: dto.name.trim(),
          displayOrder: dto.displayOrder,
          isActive: dto.isActive,
        },
      });
    });
  }

  async updateCategory(id: string, dto: UpdateKitchenCategoryDto, user: AuthenticatedUser) {
    requireKdsConfigure(user);
    const scope = resolveKdsScope(dto.tenantId, dto.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const category = await tx.kitchenCategory.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
      });
      if (category === null) throw new NotFoundException('Kitchen category not found');
      return tx.kitchenCategory.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          displayOrder: dto.displayOrder,
          isActive: dto.isActive,
          version: { increment: 1 },
        },
      });
    });
  }

  private async findTickets(
    query: KitchenQueueQueryDto,
    statuses: OrderStatus[],
    user: AuthenticatedUser,
  ) {
    const scope = resolveKdsScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const tickets = await tx.order.findMany({
        where: {
          status: { in: statuses },
          priority: query.priority,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
          ...(query.search?.trim()
            ? {
                orderNumber: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              }
            : {}),
          ...(query.kitchenCategoryId === undefined
            ? {}
            : {
                items: {
                  some: {
                    kitchenCategoryId: query.kitchenCategoryId,
                    deletedAt: null,
                  },
                },
              }),
        },
        include: ticketInclude,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
      return tickets.map((ticket) => this.toTicket(ticket, query.kitchenCategoryId));
    });
  }

  private async updateItem(
    id: string,
    status: OrderItemStatus,
    user: AuthenticatedUser,
    data: (now: Date, item: Prisma.OrderItemGetPayload<object>) => Prisma.OrderItemUpdateInput,
  ) {
    requireKdsWrite(user);
    const scope = resolveKdsScope(undefined, undefined, user, false);
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
      this.assertItemTransition(item.status, status);
      const now = new Date();
      await tx.orderItem.update({
        where: { id },
        data: { status, ...data(now, item), version: { increment: 1 } },
      });
      const ticket = await this.syncOrder(tx, item.orderId);
      this.publish(ticket, status);
      return this.toTicket(ticket);
    });
  }

  private async bulkUpdate(id: string, status: OrderItemStatus, user: AuthenticatedUser) {
    requireKdsWrite(user);
    const scope = resolveKdsScope(undefined, undefined, user, false);
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
      const now = new Date();
      if (status === OrderItemStatus.PREPARING) {
        if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.ACCEPTED) {
          throw new ConflictException('Order cannot start preparation');
        }
        await tx.orderItem.updateMany({
          where: {
            tenantId: order.tenantId,
            orderId: id,
            deletedAt: null,
            status: OrderItemStatus.PENDING,
          },
          data: {
            status,
            startedAt: now,
            version: { increment: 1 },
          },
        });
      } else {
        if (order.status !== OrderStatus.PREPARING) {
          throw new ConflictException('Only preparing orders can be marked ready');
        }
        for (const item of order.items.filter(
          ({ status: itemStatus }) => itemStatus === OrderItemStatus.PREPARING,
        )) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              status,
              readyAt: now,
              actualPrepMinutes: this.durationMinutes(item.startedAt, now),
              version: { increment: 1 },
            },
          });
        }
      }
      const ticket = await this.syncOrder(tx, id);
      this.publish(ticket, status);
      return this.toTicket(ticket);
    });
  }

  private async syncOrder(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: ticketInclude,
    });
    const statuses = order.items.map(({ status }) => status);
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
    if (next !== order.status) {
      if (
        order.status === OrderStatus.PENDING &&
        next === OrderStatus.PREPARING
      ) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.ACCEPTED,
            version: { increment: 1 },
          },
        });
      }
      const current =
        order.status === OrderStatus.PENDING && next === OrderStatus.PREPARING
          ? OrderStatus.ACCEPTED
          : order.status;
      const valid = canTransitionOrder(current, next);
      if (!valid) throw new ConflictException('Invalid aggregate order transition');
      return tx.order.update({
        where: { id: orderId },
        data: { status: next, version: { increment: 1 } },
        include: ticketInclude,
      });
    }
    return order;
  }

  private assertItemTransition(current: OrderItemStatus, next: OrderItemStatus): void {
    const valid =
      (current === OrderItemStatus.PENDING && next === OrderItemStatus.PREPARING) ||
      (current === OrderItemStatus.PREPARING && next === OrderItemStatus.READY) ||
      (current === OrderItemStatus.READY && next === OrderItemStatus.SERVED);
    if (!valid) {
      throw new ConflictException(`Cannot change ${current} item to ${next}`);
    }
  }

  private durationMinutes(startedAt: Date | null, end: Date): number {
    if (startedAt === null) return 0;
    return Math.max(0, Math.ceil((end.getTime() - startedAt.getTime()) / 60_000));
  }

  private toTicket(ticket: Ticket, kitchenCategoryId?: string) {
    const now = new Date();
    const items = ticket.items
      .filter(
        (item) => kitchenCategoryId === undefined || item.kitchenCategoryId === kitchenCategoryId,
      )
      .map((item) => {
        const actual =
          item.actualPrepMinutes ?? this.durationMinutes(item.startedAt ?? item.firedAt, now);
        return {
          ...item,
          taxPercentage: item.taxPercentage.toNumber(),
          slaStatus: kitchenSlaStatus(item.estimatedPrepMinutes, actual),
          preparationMinutes: actual,
        };
      });
    return { ...ticket, items };
  }

  private publish(ticket: Ticket, status: OrderItemStatus): void {
    const type =
      status === OrderItemStatus.PREPARING
        ? 'OrderStarted'
        : status === OrderItemStatus.READY
          ? 'OrderReady'
          : 'OrderServed';
    this.events.publish({
      type,
      tenantId: ticket.tenantId,
      outletId: ticket.outletId,
      orderId: ticket.id,
    });
    this.events.publish({
      type: 'KitchenQueueUpdated',
      tenantId: ticket.tenantId,
      outletId: ticket.outletId,
    });
  }
}
