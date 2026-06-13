import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  AuditResult,
  Prisma,
  UsageCounterOperation,
  UsageCounterPeriod,
  UsageLimitAction,
} from '@prisma/client';
import { createHash } from 'node:crypto';

import {
  applyDatabaseRequestContext,
  hasRole,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
} from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type { AdjustUsageCounterDto } from '../dto/usage-limit.dto';
import {
  requireTenantSubscriptionMutation,
  resolveTenantSubscriptionReadScope,
} from './tenant-subscription-access.util';
import { TenantEntitlementsService } from './tenant-entitlements.service';

const maximumDatabaseBigInt = 9_223_372_036_854_775_807n;

type PeriodWindow = {
  period: UsageCounterPeriod;
  key: string;
  start: Date;
  end: Date | null;
};

type EntitlementEvaluation = Awaited<
  ReturnType<TenantEntitlementsService['evaluateForTenantInTransaction']>
>;

@Injectable()
export class UsageLimitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: TenantEntitlementsService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, actor: AuthenticatedUser) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      const counters = await tx.usageCounter.findMany({
        where: { tenantId: scope },
        orderBy: [{ featureKey: 'asc' }, { periodStart: 'desc' }],
      });
      return { data: counters.map((counter) => this.counterResponse(counter)) };
    });
  }

  async evaluate(tenantId: string, featureKey: string, actor: AuthenticatedUser) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    const key = this.entitlements.normalizeFeatureKey(featureKey);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      const now = new Date();
      const entitlement = await this.entitlements.evaluateForTenantInTransaction(
        tx,
        scope,
        key,
        now,
      );
      const period = this.periodWindow(this.periodFrom(entitlement.metadata), now);
      const counter = await this.findCounter(tx, scope, key, period.key);
      return this.evaluationResponse(entitlement, period, counter?.usageValue ?? 0n);
    });
  }

  async consumeForActor(
    actor: AuthenticatedUser,
    featureKey: string,
    amount: number,
    idempotencyKey: string,
    request: AuditRequestMetadata = {},
  ) {
    const key = this.entitlements.normalizeFeatureKey(featureKey);
    if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
      return {
        featureKey: key,
        allowed: true,
        bypassed: true,
        source: 'PLATFORM_BYPASS',
      };
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException('Usage amount must be a positive safe integer');
    }
    this.assertIdempotencyKey(idempotencyKey);
    const tenantId = requireTenantId(actor);
    const fingerprint = this.fingerprint({
      action: UsageCounterOperation.CONSUME,
      tenantId,
      featureKey: key,
      amount,
    });

    const outcome = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const now = new Date();
      const entitlement = await this.entitlements.evaluateForTenantInTransaction(
        tx,
        tenantId,
        key,
        now,
      );
      const period = this.periodWindow(this.periodFrom(entitlement.metadata), now);
      await this.lock(tx, tenantId, key, period.key);

      const duplicate = await this.idempotentEvent(
        tx,
        tenantId,
        idempotencyKey,
        fingerprint,
      );
      if (duplicate) {
        const counter = await tx.usageCounter.findFirstOrThrow({
          where: { id: duplicate.counterId, tenantId },
        });
        return {
          allowed: duplicate.allowed,
          response: this.mutationResponse(
            entitlement,
            this.windowFromCounter(counter),
            counter,
            duplicate.limitAction,
            duplicate.overLimit,
          ),
        };
      }

      const counter = await this.findOrCreateCounter(tx, tenantId, key, period);
      const previous = counter.usageValue;
      const delta = BigInt(amount);
      const projected = previous + delta;
      this.assertDatabaseBigInt(projected);
      const limit = this.limit(entitlement.limitValue);
      const action = this.limitAction(entitlement.metadata);
      const overLimit = limit !== null && projected > limit;
      const allowed = entitlement.enabled && (!overLimit || action !== UsageLimitAction.BLOCK);
      const current = allowed ? projected : previous;
      const updated = allowed
        ? await tx.usageCounter.update({
            where: {
              tenantId_id: {
                tenantId,
                id: counter.id,
              },
            },
            data: {
              usageValue: current,
              version: { increment: 1 },
            },
          })
        : counter;

      await tx.usageCounterEvent.create({
        data: {
          tenantId,
          counterId: counter.id,
          featureKey: key,
          operation: UsageCounterOperation.CONSUME,
          deltaValue: delta,
          previousValue: previous,
          currentValue: current,
          limitValue: limit,
          limitAction: action,
          allowed,
          overLimit,
          actorUserId: actor.id,
          idempotencyKey: idempotencyKey.trim(),
          requestFingerprint: fingerprint,
        },
      });
      if (!allowed || overLimit) {
        await this.auditDecision(
          tx,
          actor,
          request,
          updated,
          entitlement,
          action,
          allowed,
          overLimit,
        );
      }
      return {
        allowed,
        response: this.mutationResponse(entitlement, period, updated, action, overLimit),
      };
    });

    if (!outcome.allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: outcome.response.entitlementEnabled
          ? 'USAGE_LIMIT_EXCEEDED'
          : 'ENTITLEMENT_NOT_ENABLED',
        message: outcome.response.entitlementEnabled
          ? `Usage limit reached for '${key}'`
          : `Feature entitlement '${key}' is not enabled`,
      });
    }
    return outcome.response;
  }

  async adjust(
    tenantId: string,
    featureKey: string,
    dto: AdjustUsageCounterDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const key = this.entitlements.normalizeFeatureKey(featureKey);
    const usageValue = this.parseUsageValue(dto.usageValue);
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('Usage adjustment reason is required');
    const at = dto.periodAt ? new Date(dto.periodAt) : new Date();
    if (Number.isNaN(at.getTime())) {
      throw new BadRequestException('Usage period date is invalid');
    }
    const fingerprint = this.fingerprint({
      action: UsageCounterOperation.SET,
      tenantId,
      featureKey: key,
      usageValue: usageValue.toString(),
      period: dto.period ?? null,
      periodAt: dto.periodAt ?? null,
      version: dto.version ?? null,
      reason,
    });

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const entitlement = await this.entitlements.evaluateForTenantInTransaction(
        tx,
        tenantId,
        key,
        at,
      );
      const period = this.periodWindow(
        dto.period ?? this.periodFrom(entitlement.metadata),
        at,
      );
      await this.lock(tx, tenantId, key, period.key);
      const duplicate = await this.idempotentEvent(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) {
        const counter = await tx.usageCounter.findFirstOrThrow({
          where: { id: duplicate.counterId, tenantId },
        });
        return this.mutationResponse(
          entitlement,
          this.windowFromCounter(counter),
          counter,
          duplicate.limitAction,
          duplicate.overLimit,
        );
      }

      const existing = await this.findCounter(tx, tenantId, key, period.key);
      if (!existing && dto.version !== undefined) {
        throw new BadRequestException('Version must be omitted when creating a usage counter');
      }
      if (existing && dto.version === undefined) {
        throw new BadRequestException('Version is required when adjusting a usage counter');
      }
      let counter;
      if (existing) {
        const changed = await tx.usageCounter.updateMany({
          where: { id: existing.id, tenantId, version: dto.version },
          data: { usageValue, version: { increment: 1 } },
        });
        if (changed.count !== 1) {
          throw new ConflictException('Usage counter was updated by another request');
        }
        counter = await tx.usageCounter.findFirstOrThrow({
          where: { id: existing.id, tenantId },
        });
      } else {
        counter = await tx.usageCounter.create({
          data: {
            tenantId,
            featureKey: key,
            period: period.period,
            periodKey: period.key,
            periodStart: period.start,
            periodEnd: period.end,
            usageValue,
          },
        });
      }

      const previous = existing?.usageValue ?? 0n;
      const limit = this.limit(entitlement.limitValue);
      const action = this.limitAction(entitlement.metadata);
      const overLimit = limit !== null && usageValue > limit;
      await tx.usageCounterEvent.create({
        data: {
          tenantId,
          counterId: counter.id,
          featureKey: key,
          operation: UsageCounterOperation.SET,
          deltaValue: usageValue - previous,
          previousValue: previous,
          currentValue: usageValue,
          limitValue: limit,
          limitAction: action,
          allowed: true,
          overLimit,
          actorUserId: actor.id,
          reason,
          idempotencyKey: dto.idempotencyKey.trim(),
          requestFingerprint: fingerprint,
        },
      });
      await this.audit.append(tx, {
        tenantId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'subscription.usage.adjusted',
        targetType: 'UsageCounter',
        targetId: counter.id,
        reason,
        idempotencyKey: dto.idempotencyKey.trim(),
        changes: {
          previousValue: previous.toString(),
          currentValue: usageValue.toString(),
        },
        metadata: {
          featureKey: key,
          period: period.period,
          periodKey: period.key,
          limitValue: limit?.toString() ?? null,
          overLimit,
          version: counter.version,
        },
        ...request,
      });
      return this.mutationResponse(entitlement, period, counter, action, overLimit);
    });
  }

  private async findOrCreateCounter(
    tx: Prisma.TransactionClient,
    tenantId: string,
    featureKey: string,
    period: PeriodWindow,
  ) {
    const existing = await this.findCounter(tx, tenantId, featureKey, period.key);
    if (existing) return existing;
    return tx.usageCounter.create({
      data: {
        tenantId,
        featureKey,
        period: period.period,
        periodKey: period.key,
        periodStart: period.start,
        periodEnd: period.end,
      },
    });
  }

  private findCounter(
    tx: Prisma.TransactionClient,
    tenantId: string,
    featureKey: string,
    periodKey: string,
  ) {
    return tx.usageCounter.findUnique({
      where: {
        tenantId_featureKey_periodKey: { tenantId, featureKey, periodKey },
      },
    });
  }

  private async idempotentEvent(
    tx: Prisma.TransactionClient,
    tenantId: string,
    idempotencyKey: string,
    fingerprint: string,
  ) {
    const event = await tx.usageCounterEvent.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey: idempotencyKey.trim(),
        },
      },
    });
    if (!event) return null;
    if (event.requestFingerprint !== fingerprint) {
      throw new ConflictException(
        'Idempotency key was already used for another usage command',
      );
    }
    return event;
  }

  private periodFrom(metadata: Prisma.JsonValue | null): UsageCounterPeriod {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const configured = metadata.usagePeriod;
      if (
        configured === UsageCounterPeriod.DAILY ||
        configured === UsageCounterPeriod.MONTHLY ||
        configured === UsageCounterPeriod.LIFETIME
      ) {
        return configured;
      }
    }
    return UsageCounterPeriod.LIFETIME;
  }

  private limitAction(metadata: Prisma.JsonValue | null): UsageLimitAction {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const configured = metadata.overLimitAction;
      if (
        configured === UsageLimitAction.BLOCK ||
        configured === UsageLimitAction.WARN ||
        configured === UsageLimitAction.ALLOW
      ) {
        return configured;
      }
    }
    return UsageLimitAction.BLOCK;
  }

  private periodWindow(period: UsageCounterPeriod, at: Date): PeriodWindow {
    if (period === UsageCounterPeriod.DAILY) {
      const start = new Date(
        Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
      );
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      return {
        period,
        key: start.toISOString().slice(0, 10),
        start,
        end,
      };
    }
    if (period === UsageCounterPeriod.MONTHLY) {
      const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
      const end = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
      return {
        period,
        key: start.toISOString().slice(0, 7),
        start,
        end,
      };
    }
    return {
      period: UsageCounterPeriod.LIFETIME,
      key: 'LIFETIME',
      start: new Date(0),
      end: null,
    };
  }

  private limit(value: number | null): bigint | null {
    return value === null ? null : BigInt(value);
  }

  private parseUsageValue(value: string): bigint {
    const parsed = BigInt(value);
    this.assertDatabaseBigInt(parsed);
    return parsed;
  }

  private assertDatabaseBigInt(value: bigint): void {
    if (value < 0n || value > maximumDatabaseBigInt) {
      throw new BadRequestException('Usage value exceeds the supported range');
    }
  }

  private assertIdempotencyKey(value: string): void {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(value) ||
      value.length > 160
    ) {
      throw new BadRequestException('Usage idempotency key is invalid');
    }
  }

  private fingerprint(value: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private lock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    featureKey: string,
    periodKey: string,
  ): Promise<unknown> {
    return tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${
      'usage-counter:' + tenantId + ':' + featureKey + ':' + periodKey
    }))`;
  }

  private evaluationResponse(
    entitlement: EntitlementEvaluation,
    period: PeriodWindow,
    usageValue: bigint,
  ) {
    const action = this.limitAction(entitlement.metadata);
    const limit = this.limit(entitlement.limitValue);
    const limitReached = limit !== null && usageValue >= limit;
    const overLimit = limit !== null && usageValue > limit;
    return {
      tenantId: entitlement.tenantId,
      featureKey: entitlement.featureKey,
      entitlementEnabled: entitlement.enabled,
      entitlementSource: entitlement.source,
      period: period.period,
      periodKey: period.key,
      periodStart: period.start,
      periodEnd: period.end,
      usageValue: usageValue.toString(),
      limitValue: limit?.toString() ?? null,
      remainingValue:
        limit === null ? null : (limit > usageValue ? limit - usageValue : 0n).toString(),
      limitReached,
      overLimit,
      limitAction: action,
      canConsume:
        entitlement.enabled &&
        (!limitReached || action !== UsageLimitAction.BLOCK),
    };
  }

  private mutationResponse(
    entitlement: EntitlementEvaluation,
    period: PeriodWindow,
    counter: {
      id: string;
      usageValue: bigint;
      version: number;
      createdAt: Date;
      updatedAt: Date;
    },
    action: UsageLimitAction,
    overLimit: boolean,
  ) {
    return {
      ...this.evaluationResponse(entitlement, period, counter.usageValue),
      counterId: counter.id,
      limitAction: action,
      overLimit,
      version: counter.version,
      createdAt: counter.createdAt,
      updatedAt: counter.updatedAt,
    };
  }

  private counterResponse(counter: {
    id: string;
    tenantId: string;
    featureKey: string;
    period: UsageCounterPeriod;
    periodKey: string;
    periodStart: Date;
    periodEnd: Date | null;
    usageValue: bigint;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...counter,
      usageValue: counter.usageValue.toString(),
    };
  }

  private windowFromCounter(counter: {
    period: UsageCounterPeriod;
    periodKey: string;
    periodStart: Date;
    periodEnd: Date | null;
  }): PeriodWindow {
    return {
      period: counter.period,
      key: counter.periodKey,
      start: counter.periodStart,
      end: counter.periodEnd,
    };
  }

  private async auditDecision(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    counter: {
      id: string;
      tenantId: string;
      featureKey: string;
      usageValue: bigint;
    },
    entitlement: EntitlementEvaluation,
    action: UsageLimitAction,
    allowed: boolean,
    overLimit: boolean,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: counter.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: allowed
        ? 'subscription.usage.over_limit_allowed'
        : 'subscription.usage.denied',
      targetType: 'UsageCounter',
      targetId: counter.id,
      result: allowed ? AuditResult.SUCCESS : AuditResult.DENIED,
      metadata: {
        featureKey: counter.featureKey,
        usageValue: counter.usageValue.toString(),
        limitValue:
          entitlement.limitValue === null ? null : entitlement.limitValue.toString(),
        limitAction: action,
        entitlementEnabled: entitlement.enabled,
        overLimit,
      },
      ...request,
    });
  }
}
