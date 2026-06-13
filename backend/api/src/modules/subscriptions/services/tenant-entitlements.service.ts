import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantSubscriptionStatus } from '@prisma/client';
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
import type {
  RevokeTenantEntitlementDto,
  UpsertTenantEntitlementDto,
} from '../dto/tenant-entitlement.dto';
import {
  requireTenantSubscriptionMutation,
  resolveTenantSubscriptionReadScope,
} from './tenant-subscription-access.util';

const eligibleStatuses = [
  TenantSubscriptionStatus.TRIAL,
  TenantSubscriptionStatus.ACTIVE,
];

const entitlementInclude = {
  createdBy: { select: { id: true, displayName: true } },
  updatedBy: { select: { id: true, displayName: true } },
} satisfies Prisma.TenantEntitlementInclude;

const subscriptionInclude = {
  plan: {
    include: {
      features: {
        orderBy: { featureKey: 'asc' },
      },
    },
  },
} satisfies Prisma.TenantSubscriptionInclude;

type EntitlementRecord = Prisma.TenantEntitlementGetPayload<{
  include: typeof entitlementInclude;
}>;

type SubscriptionRecord = Prisma.TenantSubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

export type EntitlementSource =
  | 'OVERRIDE'
  | 'PLAN'
  | 'NONE'
  | 'SUBSCRIPTION_INELIGIBLE'
  | 'PLATFORM_BYPASS';

@Injectable()
export class TenantEntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async evaluate(tenantId: string, featureKey: string, actor: AuthenticatedUser) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    const key = this.featureKey(featureKey);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      return this.evaluateInTransaction(tx, scope, key, new Date());
    });
  }

  async list(tenantId: string, actor: AuthenticatedUser) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      const now = new Date();
      const [subscription, overrides] = await Promise.all([
        this.currentEligibleSubscription(tx, scope, now),
        tx.tenantEntitlement.findMany({
          where: { tenantId: scope },
          include: entitlementInclude,
          orderBy: { featureKey: 'asc' },
        }),
      ]);
      const keys = new Set([
        ...(subscription?.plan.features.map((feature) => feature.featureKey) ?? []),
        ...overrides.map((override) => override.featureKey),
      ]);
      const overrideByKey = new Map(overrides.map((override) => [override.featureKey, override]));
      return {
        data: [...keys]
          .sort()
          .map((key) =>
            this.resolve(scope, key, subscription, overrideByKey.get(key) ?? null, now),
          ),
      };
    });
  }

  async upsert(
    tenantId: string,
    featureKey: string,
    dto: UpsertTenantEntitlementDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const key = this.featureKey(featureKey);
    const reason = this.requiredReason(dto.reason);
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    this.assertPeriod(effectiveFrom, effectiveTo);
    const fingerprint = this.fingerprint({
      action: 'UPSERT',
      tenantId,
      featureKey: key,
      isEnabled: dto.isEnabled,
      limitValue: dto.limitValue ?? null,
      metadata: dto.metadata ?? null,
      reason,
      effectiveFrom: dto.effectiveFrom ?? null,
      effectiveTo: dto.effectiveTo ?? null,
      version: dto.version ?? null,
    });

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lock(tx, tenantId, key);
      const duplicate = await this.idempotentEntitlement(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) {
        return this.evaluateInTransaction(tx, tenantId, duplicate.featureKey, new Date());
      }

      await this.requireTenant(tx, tenantId);
      const existing = await this.findOverride(tx, tenantId, key);
      let entitlement: EntitlementRecord;
      let action: 'created' | 'updated';
      if (!existing) {
        if (dto.version !== undefined) {
          throw new BadRequestException('Version must be omitted when creating an entitlement');
        }
        entitlement = await tx.tenantEntitlement.create({
          data: {
            tenantId,
            featureKey: key,
            isEnabled: dto.isEnabled,
            limitValue: dto.limitValue ?? null,
            metadata: dto.metadata
              ? (dto.metadata as Prisma.InputJsonObject)
              : Prisma.JsonNull,
            reason,
            effectiveFrom,
            effectiveTo,
            createdByUserId: actor.id,
            updatedByUserId: actor.id,
            lastIdempotencyKey: dto.idempotencyKey.trim(),
            lastRequestFingerprint: fingerprint,
          },
          include: entitlementInclude,
        });
        action = 'created';
      } else {
        if (dto.version === undefined) {
          throw new BadRequestException('Version is required when updating an entitlement');
        }
        const changed = await tx.tenantEntitlement.updateMany({
          where: { id: existing.id, tenantId, version: dto.version },
          data: {
            isEnabled: dto.isEnabled,
            limitValue: dto.limitValue ?? null,
            metadata: dto.metadata
              ? (dto.metadata as Prisma.InputJsonObject)
              : Prisma.JsonNull,
            reason,
            effectiveFrom,
            effectiveTo,
            revokedAt: null,
            updatedByUserId: actor.id,
            lastIdempotencyKey: dto.idempotencyKey.trim(),
            lastRequestFingerprint: fingerprint,
            version: { increment: 1 },
          },
        });
        if (changed.count !== 1) throw this.concurrentUpdate();
        entitlement = await this.requireOverride(tx, tenantId, key);
        action = 'updated';
      }

      await this.auditChange(tx, entitlement, actor, request, action);
      return this.evaluateInTransaction(tx, tenantId, key, new Date());
    });
  }

  async revoke(
    tenantId: string,
    featureKey: string,
    dto: RevokeTenantEntitlementDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const key = this.featureKey(featureKey);
    const reason = this.requiredReason(dto.reason);
    const fingerprint = this.fingerprint({
      action: 'REVOKE',
      tenantId,
      featureKey: key,
      version: dto.version,
      reason,
    });

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lock(tx, tenantId, key);
      const duplicate = await this.idempotentEntitlement(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) {
        return this.evaluateInTransaction(tx, tenantId, duplicate.featureKey, new Date());
      }

      const existing = await this.requireOverride(tx, tenantId, key);
      if (existing.revokedAt) {
        throw new ConflictException('Tenant entitlement is already revoked');
      }
      const changed = await tx.tenantEntitlement.updateMany({
        where: { id: existing.id, tenantId, version: dto.version, revokedAt: null },
        data: {
          reason,
          revokedAt: new Date(),
          updatedByUserId: actor.id,
          lastIdempotencyKey: dto.idempotencyKey.trim(),
          lastRequestFingerprint: fingerprint,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw this.concurrentUpdate();
      const entitlement = await this.requireOverride(tx, tenantId, key);
      await this.auditChange(tx, entitlement, actor, request, 'revoked');
      return this.evaluateInTransaction(tx, tenantId, key, new Date());
    });
  }

  async requireForActor(actor: AuthenticatedUser, featureKey: string) {
    const key = this.featureKey(featureKey);
    if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
      return {
        featureKey: key,
        enabled: true,
        source: 'PLATFORM_BYPASS' as EntitlementSource,
      };
    }
    const tenantId = requireTenantId(actor);
    const result = await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      return this.evaluateInTransaction(tx, tenantId, key, new Date());
    });
    if (!result.enabled) {
      throw new ForbiddenException(`Feature entitlement '${key}' is not enabled`);
    }
    return result;
  }

  private async evaluateInTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    featureKey: string,
    now: Date,
  ) {
    const [subscription, override] = await Promise.all([
      this.currentEligibleSubscription(tx, tenantId, now),
      this.findOverride(tx, tenantId, featureKey),
    ]);
    return this.resolve(tenantId, featureKey, subscription, override, now);
  }

  private resolve(
    tenantId: string,
    featureKey: string,
    subscription: SubscriptionRecord | null,
    override: EntitlementRecord | null,
    now: Date,
  ) {
    const overrideActive =
      override !== null &&
      override.revokedAt === null &&
      override.effectiveFrom <= now &&
      (override.effectiveTo === null || override.effectiveTo > now);
    const planFeature =
      subscription?.plan.features.find((feature) => feature.featureKey === featureKey) ?? null;

    let source: EntitlementSource;
    let enabled: boolean;
    let limitValue: number | null;
    let metadata: Prisma.JsonValue | null;
    if (!subscription) {
      source = 'SUBSCRIPTION_INELIGIBLE';
      enabled = false;
      limitValue = null;
      metadata = null;
    } else if (overrideActive && override) {
      source = 'OVERRIDE';
      enabled = override.isEnabled;
      limitValue = override.limitValue;
      metadata = override.metadata;
    } else if (planFeature) {
      source = 'PLAN';
      enabled = planFeature.isEnabled;
      limitValue = planFeature.limitValue;
      metadata = planFeature.metadata;
    } else {
      source = 'NONE';
      enabled = false;
      limitValue = null;
      metadata = null;
    }

    return {
      tenantId,
      featureKey,
      enabled,
      source,
      limitValue,
      metadata,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            startsAt: subscription.startsAt,
            endsAt: subscription.endsAt,
            plan: {
              id: subscription.plan.id,
              code: subscription.plan.code,
              versionNumber: subscription.plan.versionNumber,
            },
          }
        : null,
      override: override ? this.overrideResponse(override, overrideActive) : null,
    };
  }

  private currentEligibleSubscription(
    tx: Prisma.TransactionClient,
    tenantId: string,
    now: Date,
  ): Promise<SubscriptionRecord | null> {
    return tx.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: eligibleStatuses },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: subscriptionInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  private findOverride(
    tx: Prisma.TransactionClient,
    tenantId: string,
    featureKey: string,
  ): Promise<EntitlementRecord | null> {
    return tx.tenantEntitlement.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      include: entitlementInclude,
    });
  }

  private async requireOverride(
    tx: Prisma.TransactionClient,
    tenantId: string,
    featureKey: string,
  ): Promise<EntitlementRecord> {
    const entitlement = await this.findOverride(tx, tenantId, featureKey);
    if (!entitlement) throw new NotFoundException('Tenant entitlement not found');
    return entitlement;
  }

  private async idempotentEntitlement(
    tx: Prisma.TransactionClient,
    tenantId: string,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<EntitlementRecord | null> {
    const entitlement = await tx.tenantEntitlement.findUnique({
      where: {
        tenantId_lastIdempotencyKey: {
          tenantId,
          lastIdempotencyKey: idempotencyKey.trim(),
        },
      },
      include: entitlementInclude,
    });
    if (!entitlement) return null;
    if (entitlement.lastRequestFingerprint !== fingerprint) {
      throw new ConflictException(
        'Idempotency key was already used for another entitlement command',
      );
    }
    return entitlement;
  }

  private async requireTenant(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<void> {
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  private featureKey(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_.-]*$/.test(normalized) || normalized.length > 120) {
      throw new BadRequestException('Feature key is invalid');
    }
    return normalized;
  }

  private requiredReason(value: string): string {
    const reason = value.trim();
    if (!reason) throw new BadRequestException('Entitlement change reason is required');
    return reason;
  }

  private assertPeriod(from: Date, to: Date | null): void {
    if (Number.isNaN(from.getTime()) || (to && Number.isNaN(to.getTime()))) {
      throw new BadRequestException('Entitlement effective period is invalid');
    }
    if (to && to <= from) {
      throw new BadRequestException('Entitlement effective end must be after its start');
    }
  }

  private fingerprint(value: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private concurrentUpdate(): ConflictException {
    return new ConflictException('Tenant entitlement was updated by another request');
  }

  private lock(
    tx: Prisma.TransactionClient,
    tenantId: string,
    featureKey: string,
  ): Promise<unknown> {
    return tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${
      'tenant-entitlement:' + tenantId + ':' + featureKey
    }))`;
  }

  private async auditChange(
    tx: Prisma.TransactionClient,
    entitlement: EntitlementRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: 'created' | 'updated' | 'revoked',
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: entitlement.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: `subscription.entitlement.${action}`,
      targetType: 'TenantEntitlement',
      targetId: entitlement.id,
      metadata: {
        featureKey: entitlement.featureKey,
        isEnabled: entitlement.isEnabled,
        limitValue: entitlement.limitValue,
        effectiveFrom: entitlement.effectiveFrom.toISOString(),
        effectiveTo: entitlement.effectiveTo?.toISOString() ?? null,
        revokedAt: entitlement.revokedAt?.toISOString() ?? null,
        version: entitlement.version,
      },
      ...request,
    });
  }

  private overrideResponse(entitlement: EntitlementRecord, active: boolean) {
    return {
      id: entitlement.id,
      isEnabled: entitlement.isEnabled,
      limitValue: entitlement.limitValue,
      metadata: entitlement.metadata,
      reason: entitlement.reason,
      effectiveFrom: entitlement.effectiveFrom,
      effectiveTo: entitlement.effectiveTo,
      revokedAt: entitlement.revokedAt,
      active,
      version: entitlement.version,
      createdBy: entitlement.createdBy,
      updatedBy: entitlement.updatedBy,
      createdAt: entitlement.createdAt,
      updatedAt: entitlement.updatedAt,
    };
  }
}
