import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SubscriptionPlanStatus,
  TenantSubscriptionEventType,
  TenantSubscriptionStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  ActivateTenantSubscriptionDto,
  ChangeTenantSubscriptionPlanDto,
  ChangeTenantSubscriptionStatusDto,
  TenantSubscriptionHistoryQueryDto,
  TenantSubscriptionQueryDto,
} from '../dto/tenant-subscription.dto';
import {
  requireTenantSubscriptionMutation,
  resolveTenantSubscriptionReadScope,
} from './tenant-subscription-access.util';

const subscriptionInclude = {
  plan: {
    include: {
      features: {
        orderBy: { featureKey: 'asc' },
      },
    },
  },
} satisfies Prisma.TenantSubscriptionInclude;

const eventInclude = {
  previousPlan: true,
  newPlan: true,
} satisfies Prisma.TenantSubscriptionEventInclude;

type SubscriptionRecord = Prisma.TenantSubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

type EventRecord = Prisma.TenantSubscriptionEventGetPayload<{
  include: typeof eventInclude;
}>;

@Injectable()
export class TenantSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async activate(
    tenantId: string,
    dto: ActivateTenantSubscriptionDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    this.assertPeriod(startsAt, endsAt);
    const fingerprint = this.fingerprint({
      action: 'ACTIVATED',
      tenantId,
      planId: dto.planId,
      startsAt: dto.startsAt ?? null,
      endsAt: dto.endsAt ?? null,
    });

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lockTenant(tx, tenantId);
      const duplicate = await this.idempotentSubscription(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) return this.response(duplicate);

      await this.requireTenant(tx, tenantId);
      const plan = await this.requireActivePlan(tx, dto.planId);
      const current = await this.findCurrent(tx, tenantId);
      if (current) {
        throw new ConflictException('Tenant already has a current subscription');
      }

      const subscription = await tx.tenantSubscription.create({
        data: {
          tenantId,
          planId: plan.id,
          status: TenantSubscriptionStatus.ACTIVE,
          startsAt,
          endsAt,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        include: subscriptionInclude,
      });
      await this.appendEvent(tx, {
        tenantId,
        subscription,
        eventType: TenantSubscriptionEventType.ACTIVATED,
        previousStatus: null,
        previousPlanId: null,
        actor,
        idempotencyKey: dto.idempotencyKey,
        requestFingerprint: fingerprint,
      });
      await this.auditTransition(tx, subscription, actor, request, 'activated');
      return this.response(subscription);
    });
  }

  async list(tenantId: string, query: TenantSubscriptionQueryDto, actor: AuthenticatedUser) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      const where: Prisma.TenantSubscriptionWhereInput = {
        tenantId: scope,
        ...(query.status ? { status: query.status } : {}),
      };
      const [records, total] = await Promise.all([
        tx.tenantSubscription.findMany({
          where,
          include: subscriptionInclude,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.tenantSubscription.count({ where }),
      ]);
      return {
        data: records.map((record) => this.response(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async current(tenantId: string, actor: AuthenticatedUser) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      const subscription = await this.findCurrent(tx, scope);
      if (!subscription) {
        throw new NotFoundException('Current tenant subscription not found');
      }
      return this.response(subscription);
    });
  }

  async detail(tenantId: string, id: string, actor: AuthenticatedUser) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      return this.response(await this.find(tx, scope, id));
    });
  }

  async history(
    tenantId: string,
    query: TenantSubscriptionHistoryQueryDto,
    actor: AuthenticatedUser,
  ) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      const where: Prisma.TenantSubscriptionEventWhereInput = {
        tenantId: scope,
        ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
      };
      const [records, total] = await Promise.all([
        tx.tenantSubscriptionEvent.findMany({
          where,
          include: eventInclude,
          orderBy: { occurredAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.tenantSubscriptionEvent.count({ where }),
      ]);
      return {
        data: records.map((record) => this.eventResponse(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  upgrade(
    tenantId: string,
    id: string,
    dto: ChangeTenantSubscriptionPlanDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    return this.changePlan(
      tenantId,
      id,
      dto,
      actor,
      request,
      TenantSubscriptionEventType.UPGRADED,
      'upgraded',
    );
  }

  downgrade(
    tenantId: string,
    id: string,
    dto: ChangeTenantSubscriptionPlanDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    return this.changePlan(
      tenantId,
      id,
      dto,
      actor,
      request,
      TenantSubscriptionEventType.DOWNGRADED,
      'downgraded',
    );
  }

  suspend(
    tenantId: string,
    id: string,
    dto: ChangeTenantSubscriptionStatusDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    return this.changeStatus(
      tenantId,
      id,
      dto,
      actor,
      request,
      [TenantSubscriptionStatus.ACTIVE],
      TenantSubscriptionStatus.SUSPENDED,
      TenantSubscriptionEventType.SUSPENDED,
      'suspended',
      { suspendedAt: new Date() },
    );
  }

  resume(
    tenantId: string,
    id: string,
    dto: ChangeTenantSubscriptionStatusDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    return this.changeStatus(
      tenantId,
      id,
      dto,
      actor,
      request,
      [TenantSubscriptionStatus.SUSPENDED],
      TenantSubscriptionStatus.ACTIVE,
      TenantSubscriptionEventType.RESUMED,
      'resumed',
      { suspendedAt: null },
    );
  }

  expire(
    tenantId: string,
    id: string,
    dto: ChangeTenantSubscriptionStatusDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    const now = new Date();
    return this.changeStatus(
      tenantId,
      id,
      dto,
      actor,
      request,
      [
        TenantSubscriptionStatus.TRIAL,
        TenantSubscriptionStatus.ACTIVE,
        TenantSubscriptionStatus.SUSPENDED,
      ],
      TenantSubscriptionStatus.EXPIRED,
      TenantSubscriptionEventType.EXPIRED,
      'expired',
      { expiredAt: now, suspendedAt: null, endsAt: now },
    );
  }

  cancel(
    tenantId: string,
    id: string,
    dto: ChangeTenantSubscriptionStatusDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    return this.changeStatus(
      tenantId,
      id,
      dto,
      actor,
      request,
      [
        TenantSubscriptionStatus.TRIAL,
        TenantSubscriptionStatus.ACTIVE,
        TenantSubscriptionStatus.SUSPENDED,
      ],
      TenantSubscriptionStatus.CANCELLED,
      TenantSubscriptionEventType.CANCELLED,
      'cancelled',
      { cancelledAt: new Date(), suspendedAt: null },
    );
  }

  private async changePlan(
    tenantId: string,
    id: string,
    dto: ChangeTenantSubscriptionPlanDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    eventType: TenantSubscriptionEventType,
    auditAction: 'upgraded' | 'downgraded',
  ) {
    requireTenantSubscriptionMutation(actor);
    const reason = this.reason(dto.reason);
    const fingerprint = this.fingerprint({
      action: eventType,
      tenantId,
      subscriptionId: id,
      planId: dto.planId,
      version: dto.version,
      reason,
    });
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lockTenant(tx, tenantId);
      const duplicate = await this.idempotentSubscription(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) return this.response(duplicate);

      const subscription = await this.find(tx, tenantId, id);
      if (subscription.status !== TenantSubscriptionStatus.ACTIVE) {
        throw new ConflictException('Only active subscriptions can change plans');
      }
      if (subscription.planId === dto.planId) {
        throw new ConflictException('Target plan version must differ from the current plan');
      }
      const plan = await this.requireActivePlan(tx, dto.planId);
      const changed = await tx.tenantSubscription.updateMany({
        where: {
          id,
          tenantId,
          version: dto.version,
          status: TenantSubscriptionStatus.ACTIVE,
        },
        data: {
          planId: plan.id,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw this.concurrentUpdate();
      const updated = await this.find(tx, tenantId, id);
      await this.appendEvent(tx, {
        tenantId,
        subscription: updated,
        eventType,
        previousStatus: subscription.status,
        previousPlanId: subscription.planId,
        actor,
        reason,
        idempotencyKey: dto.idempotencyKey,
        requestFingerprint: fingerprint,
      });
      await this.auditTransition(tx, updated, actor, request, auditAction, {
        previousPlanId: subscription.planId,
        reason,
      });
      return this.response(updated);
    });
  }

  private async changeStatus(
    tenantId: string,
    id: string,
    dto: ChangeTenantSubscriptionStatusDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    allowedStatuses: TenantSubscriptionStatus[],
    newStatus: TenantSubscriptionStatus,
    eventType: TenantSubscriptionEventType,
    auditAction: 'suspended' | 'resumed' | 'expired' | 'cancelled',
    timestamps: Prisma.TenantSubscriptionUncheckedUpdateInput,
  ) {
    requireTenantSubscriptionMutation(actor);
    const reason = this.reason(dto.reason);
    const fingerprint = this.fingerprint({
      action: eventType,
      tenantId,
      subscriptionId: id,
      version: dto.version,
      reason,
    });
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lockTenant(tx, tenantId);
      const duplicate = await this.idempotentSubscription(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) return this.response(duplicate);

      const subscription = await this.find(tx, tenantId, id);
      if (!allowedStatuses.includes(subscription.status)) {
        throw new ConflictException(
          `Subscription cannot transition from ${subscription.status} to ${newStatus}`,
        );
      }
      const changed = await tx.tenantSubscription.updateMany({
        where: {
          id,
          tenantId,
          version: dto.version,
          status: { in: allowedStatuses },
        },
        data: {
          status: newStatus,
          ...timestamps,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw this.concurrentUpdate();
      const updated = await this.find(tx, tenantId, id);
      await this.appendEvent(tx, {
        tenantId,
        subscription: updated,
        eventType,
        previousStatus: subscription.status,
        previousPlanId: subscription.planId,
        actor,
        reason,
        idempotencyKey: dto.idempotencyKey,
        requestFingerprint: fingerprint,
      });
      await this.auditTransition(tx, updated, actor, request, auditAction, {
        previousStatus: subscription.status,
        reason,
      });
      return this.response(updated);
    });
  }

  private async appendEvent(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      subscription: SubscriptionRecord;
      eventType: TenantSubscriptionEventType;
      previousStatus: TenantSubscriptionStatus | null;
      previousPlanId: string | null;
      actor: AuthenticatedUser;
      reason?: string | null;
      idempotencyKey: string;
      requestFingerprint: string;
    },
  ): Promise<void> {
    await tx.tenantSubscriptionEvent.create({
      data: {
        tenantId: input.tenantId,
        subscriptionId: input.subscription.id,
        eventType: input.eventType,
        previousStatus: input.previousStatus,
        newStatus: input.subscription.status,
        previousPlanId: input.previousPlanId,
        newPlanId: input.subscription.planId,
        actorUserId: input.actor.id,
        reason: input.reason ?? null,
        idempotencyKey: input.idempotencyKey.trim(),
        requestFingerprint: input.requestFingerprint,
      },
    });
  }

  private async idempotentSubscription(
    tx: Prisma.TransactionClient,
    tenantId: string,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<SubscriptionRecord | null> {
    const event = await tx.tenantSubscriptionEvent.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey: idempotencyKey.trim(),
        },
      },
      select: {
        subscriptionId: true,
        requestFingerprint: true,
      },
    });
    if (!event) return null;
    if (event.requestFingerprint !== fingerprint) {
      throw new ConflictException(
        'Idempotency key was already used for another subscription command',
      );
    }
    return this.find(tx, tenantId, event.subscriptionId);
  }

  private async requireTenant(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  private async requireActivePlan(tx: Prisma.TransactionClient, planId: string) {
    const plan = await tx.subscriptionPlan.findFirst({
      where: {
        id: planId,
        status: SubscriptionPlanStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!plan) {
      throw new BadRequestException('Subscription requires an active plan version');
    }
    return plan;
  }

  private findCurrent(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<SubscriptionRecord | null> {
    return tx.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: {
          in: [
            TenantSubscriptionStatus.TRIAL,
            TenantSubscriptionStatus.ACTIVE,
            TenantSubscriptionStatus.SUSPENDED,
          ],
        },
      },
      include: subscriptionInclude,
    });
  }

  private async find(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<SubscriptionRecord> {
    const subscription = await tx.tenantSubscription.findFirst({
      where: { id, tenantId },
      include: subscriptionInclude,
    });
    if (!subscription) {
      throw new NotFoundException('Tenant subscription not found');
    }
    return subscription;
  }

  private assertPeriod(startsAt: Date, endsAt: Date | null): void {
    if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
      throw new BadRequestException('Subscription period is invalid');
    }
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException('Subscription end must be after its start');
    }
    if (startsAt.getTime() > Date.now()) {
      throw new BadRequestException('Subscription activation cannot start in the future');
    }
  }

  private reason(value: string | undefined): string | null {
    return value?.trim() || null;
  }

  private fingerprint(value: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private concurrentUpdate(): ConflictException {
    return new ConflictException('Tenant subscription was updated by another request');
  }

  private lockTenant(tx: Prisma.TransactionClient, tenantId: string): Promise<unknown> {
    return tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'tenant-subscription:' + tenantId}))`;
  }

  private async auditTransition(
    tx: Prisma.TransactionClient,
    subscription: SubscriptionRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action:
      | 'activated'
      | 'upgraded'
      | 'downgraded'
      | 'suspended'
      | 'resumed'
      | 'expired'
      | 'cancelled',
    metadata: Prisma.InputJsonObject = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: subscription.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: `subscription.lifecycle.${action}`,
      targetType: 'TenantSubscription',
      targetId: subscription.id,
      metadata: {
        planId: subscription.planId,
        planCode: subscription.plan.code,
        planVersionNumber: subscription.plan.versionNumber,
        status: subscription.status,
        version: subscription.version,
        ...metadata,
      },
      ...request,
    });
  }

  private response(subscription: SubscriptionRecord) {
    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      status: subscription.status,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
      suspendedAt: subscription.suspendedAt,
      expiredAt: subscription.expiredAt,
      cancelledAt: subscription.cancelledAt,
      plan: {
        id: subscription.plan.id,
        code: subscription.plan.code,
        versionNumber: subscription.plan.versionNumber,
        name: subscription.plan.name,
        billingInterval: subscription.plan.billingInterval,
        priceMinor: subscription.plan.priceMinor,
        currencyCode: subscription.plan.currencyCode,
        features: subscription.plan.features.map((feature) => ({
          featureKey: feature.featureKey,
          isEnabled: feature.isEnabled,
          limitValue: feature.limitValue,
          metadata: feature.metadata,
        })),
      },
      version: subscription.version,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  private eventResponse(event: EventRecord) {
    return {
      id: event.id,
      tenantId: event.tenantId,
      subscriptionId: event.subscriptionId,
      eventType: event.eventType,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      previousPlan: event.previousPlan
        ? {
            id: event.previousPlan.id,
            code: event.previousPlan.code,
            versionNumber: event.previousPlan.versionNumber,
          }
        : null,
      newPlan: {
        id: event.newPlan.id,
        code: event.newPlan.code,
        versionNumber: event.newPlan.versionNumber,
      },
      reason: event.reason,
      occurredAt: event.occurredAt,
    };
  }
}
