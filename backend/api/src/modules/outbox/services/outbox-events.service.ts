import { Injectable, NotFoundException } from '@nestjs/common';
import { OutboxEventScope, Prisma } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { OutboxEventQueryDto, OutboxEventScopeDto } from '../dto/outbox-event-query.dto';
import { requireOutboxView, resolveOutboxReadScope } from './outbox-access.util';

const outboxSelect = {
  id: true,
  scope: true,
  scopeKey: true,
  tenantId: true,
  outletId: true,
  eventType: true,
  aggregateType: true,
  aggregateId: true,
  idempotencyKey: true,
  requestFingerprint: true,
  redactedPayload: true,
  status: true,
  availableAt: true,
  processedAt: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OutboxEventSelect;

type OutboxEventRecord = Prisma.OutboxEventGetPayload<{ select: typeof outboxSelect }>;

@Injectable()
export class OutboxEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: OutboxEventQueryDto, actor: AuthenticatedUser) {
    requireOutboxView(actor);
    const scope = resolveOutboxReadScope(actor, query.tenantId, query.outletId, query.scope);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.OutboxEventWhereInput = {
        ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
        ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(!scope.platformOnly && scope.outletId ? { outletId: scope.outletId } : {}),
        ...(!scope.platformOnly && query.scope ? { scope: query.scope } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.eventType?.trim() ? { eventType: query.eventType.trim() } : {}),
        ...(query.aggregateType?.trim() ? { aggregateType: query.aggregateType.trim() } : {}),
        ...(query.aggregateId?.trim() ? { aggregateId: query.aggregateId.trim() } : {}),
        ...(query.idempotencyKey?.trim() ? { idempotencyKey: query.idempotencyKey.trim() } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      };
      const [records, total] = await Promise.all([
        tx.outboxEvent.findMany({
          where,
          select: outboxSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.outboxEvent.count({ where }),
      ]);
      return {
        data: records.map((record) => this.toResponse(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: OutboxEventScopeDto, actor: AuthenticatedUser) {
    requireOutboxView(actor);
    const scope = resolveOutboxReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const record = await tx.outboxEvent.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
        },
        select: outboxSelect,
      });
      if (!record) throw new NotFoundException('Outbox event not found');
      return this.toResponse(record);
    });
  }

  private toResponse(record: OutboxEventRecord) {
    return {
      id: record.id,
      scope: record.scope,
      scopeKey: record.scopeKey,
      tenantId: record.tenantId,
      outletId: record.outletId,
      eventType: record.eventType,
      aggregateType: record.aggregateType,
      aggregateId: record.aggregateId,
      idempotencyKey: record.idempotencyKey,
      requestFingerprint: record.requestFingerprint,
      payload: record.redactedPayload,
      status: record.status,
      availableAt: record.availableAt.toISOString(),
      processedAt: record.processedAt?.toISOString() ?? null,
      createdByUserId: record.createdByUserId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
