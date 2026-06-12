import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditResult, Prisma, type AuditEvent } from '@prisma/client';
import { createHash } from 'node:crypto';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditQueryDto } from '../dto/audit-query.dto';
import type { ExportAuditDto } from '../dto/export-audit.dto';
import type { AppendAuditEvent, AuditRequestMetadata } from '../models/audit-event.model';
import { requireAuditExport, resolveAuditScope } from './audit-access.util';
import { sanitizeAuditValue } from './audit-redaction.util';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async append(
    transaction: Prisma.TransactionClient,
    input: AppendAuditEvent,
  ): Promise<AuditEvent> {
    const scopeKey = input.tenantId ?? 'PLATFORM';
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${scopeKey}))`;
    const previous = await transaction.auditEvent.findFirst({
      where: { scopeKey },
      orderBy: { sequence: 'desc' },
      select: { eventHash: true },
    });
    const occurredAt = new Date();
    const changes = jsonInput(input.changes);
    const metadata = jsonInput(input.metadata);
    const hashPayload = {
      scopeKey,
      tenantId: input.tenantId,
      outletId: input.outletId ?? null,
      actorUserId: input.actorUserId ?? null,
      effectiveUserId: input.effectiveUserId ?? input.actorUserId ?? null,
      impersonatorUserId: input.impersonatorUserId ?? null,
      actorRoles: input.actorRoles ?? [],
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      result: input.result ?? AuditResult.SUCCESS,
      reason: input.reason ?? null,
      changes,
      metadata,
      correlationId: input.correlationId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      occurredAt: occurredAt.toISOString(),
      previousHash: previous?.eventHash ?? null,
    };
    const eventHash = createHash('sha256').update(stableStringify(hashPayload)).digest('hex');
    return transaction.auditEvent.create({
      data: {
        ...hashPayload,
        changes: changes ?? Prisma.JsonNull,
        metadata: metadata ?? Prisma.JsonNull,
        occurredAt,
        eventHash,
      },
    });
  }

  async record(input: AppendAuditEvent, actor: AuthenticatedUser): Promise<AuditEvent> {
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, input.tenantId ?? undefined);
      return this.append(transaction, input);
    });
  }

  async findAll(
    query: AuditQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<object> {
    const scope = resolveAuditScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, scope.tenantId);
      const where = this.where(query, scope);
      const [records, total] = await Promise.all([
        transaction.auditEvent.findMany({
          where,
          orderBy: { sequence: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.auditEvent.count({ where }),
      ]);
      await this.append(transaction, {
        tenantId: scope.tenantId ?? null,
        outletId: scope.outletId ?? null,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'audit.events.read',
        targetType: 'AuditEventCollection',
        metadata: {
          filters: safeJson(query),
          returned: records.length,
        },
        ...request,
      });
      return {
        data: records.map(toResponse),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async findOne(
    id: string,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<object> {
    const scope = resolveAuditScope(actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, scope.tenantId);
      const event = await transaction.auditEvent.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
      });
      if (!event) throw new NotFoundException('Audit event not found');
      await this.append(transaction, {
        tenantId: event.tenantId,
        outletId: event.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'audit.event.read',
        targetType: 'AuditEvent',
        targetId: event.id,
        ...request,
      });
      return toResponse(event);
    });
  }

  async export(
    dto: ExportAuditDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<object> {
    requireAuditExport(actor);
    const scope = resolveAuditScope(actor, dto.filters.tenantId, dto.filters.outletId);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, scope.tenantId);
      const event = await this.append(transaction, {
        tenantId: scope.tenantId ?? null,
        outletId: scope.outletId ?? null,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'audit.events.export.requested',
        targetType: 'AuditExport',
        metadata: {
          format: dto.format,
          filters: safeJson(dto.filters),
        },
        ...request,
      });
      return {
        auditId: event.id,
        format: dto.format,
        status: 'FOUNDATION_READY',
        requestedAt: event.occurredAt,
        message: 'Audit export request recorded; asynchronous rendering and delivery are deferred.',
      };
    });
  }

  private where(
    query: AuditQueryDto,
    scope: { tenantId: string | undefined; outletId: string | undefined },
  ): Prisma.AuditEventWhereInput {
    return {
      ...(scope.tenantId !== undefined ? { tenantId: scope.tenantId } : {}),
      ...(scope.outletId ? { outletId: scope.outletId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.targetType
        ? { targetType: { contains: query.targetType, mode: 'insensitive' } }
        : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { action: { contains: query.search.trim(), mode: 'insensitive' } },
              { targetType: { contains: query.search.trim(), mode: 'insensitive' } },
              { targetId: { contains: query.search.trim(), mode: 'insensitive' } },
              { reason: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}

function jsonInput(value: Prisma.InputJsonValue | null | undefined) {
  if (value === null || value === undefined) return null;
  return sanitizeAuditValue(value) as Prisma.InputJsonValue;
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return sanitizeAuditValue(value) as Prisma.InputJsonValue;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function toResponse(event: AuditEvent): object {
  return {
    ...event,
    sequence: event.sequence.toString(),
  };
}
