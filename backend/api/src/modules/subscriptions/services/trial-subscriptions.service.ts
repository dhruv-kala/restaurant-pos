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
  TrialSubscriptionEventType,
  TrialSubscriptionStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  ConvertTrialSubscriptionDto,
  ExpireDueTrialsDto,
  ExpireTrialSubscriptionDto,
  ExtendTrialSubscriptionDto,
  StartTrialSubscriptionDto,
  TrialSubscriptionHistoryQueryDto,
} from '../dto/trial-subscription.dto';
import {
  requireTenantSubscriptionMutation,
  resolveTenantSubscriptionReadScope,
} from './tenant-subscription-access.util';

const trialInclude = {
  plan: true,
  convertedPlan: true,
  subscription: {
    include: {
      plan: {
        include: {
          features: { orderBy: { featureKey: 'asc' } },
        },
      },
    },
  },
} satisfies Prisma.TrialSubscriptionInclude;

const trialEventInclude = {
  previousPlan: true,
  newPlan: true,
} satisfies Prisma.TrialSubscriptionEventInclude;

type TrialRecord = Prisma.TrialSubscriptionGetPayload<{ include: typeof trialInclude }>;
type TrialEventRecord = Prisma.TrialSubscriptionEventGetPayload<{
  include: typeof trialEventInclude;
}>;
type SubscriptionRecord = TrialRecord['subscription'];

@Injectable()
export class TrialSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async start(
    tenantId: string,
    dto: StartTrialSubscriptionDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const endsAt = new Date(dto.endsAt);
    this.assertTrialPeriod(startsAt, endsAt);
    const reason = this.reason(dto.reason);
    const fingerprint = this.fingerprint({
      action: TrialSubscriptionEventType.STARTED,
      tenantId,
      planId: dto.planId,
      startsAt: dto.startsAt ?? null,
      endsAt: dto.endsAt,
      reason,
    });

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lockTenant(tx, tenantId);
      const duplicate = await this.idempotentTrial(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) return this.response(duplicate);

      await this.requireTenant(tx, tenantId);
      const plan = await this.requireActivePlan(tx, dto.planId);
      const existingTrial = await tx.trialSubscription.findFirst({
        where: { tenantId },
        select: { id: true },
      });
      if (existingTrial) {
        throw new ConflictException('Tenant has already used a trial subscription');
      }
      const current = await this.findCurrentSubscription(tx, tenantId);
      if (current) {
        throw new ConflictException('Tenant already has a current subscription');
      }

      const subscription = await tx.tenantSubscription.create({
        data: {
          tenantId,
          planId: plan.id,
          status: TenantSubscriptionStatus.TRIAL,
          startsAt,
          endsAt,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        include: trialInclude.subscription.include,
      });
      const trial = await tx.trialSubscription.create({
        data: {
          tenantId,
          subscriptionId: subscription.id,
          planId: plan.id,
          status: TrialSubscriptionStatus.ACTIVE,
          startsAt,
          endsAt,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        include: trialInclude,
      });
      await this.appendSubscriptionEvent(tx, {
        tenantId,
        subscription,
        eventType: TenantSubscriptionEventType.TRIAL_STARTED,
        previousStatus: null,
        previousPlanId: null,
        actor,
        reason,
        idempotencyKey: this.subscriptionEventKey(dto.idempotencyKey),
        requestFingerprint: fingerprint,
      });
      await this.appendTrialEvent(tx, {
        tenantId,
        trial,
        eventType: TrialSubscriptionEventType.STARTED,
        previousStatus: null,
        previousEndsAt: null,
        previousPlanId: null,
        newPlanId: plan.id,
        actor,
        reason,
        idempotencyKey: dto.idempotencyKey,
        requestFingerprint: fingerprint,
      });
      await this.auditTrial(tx, trial, actor, request, 'started', { reason });
      return this.response(trial);
    });
  }

  async list(tenantId: string, actor: AuthenticatedUser) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      const records = await tx.trialSubscription.findMany({
        where: { tenantId: scope },
        include: trialInclude,
        orderBy: { createdAt: 'desc' },
      });
      return { data: records.map((record) => this.response(record)) };
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
    id: string,
    query: TrialSubscriptionHistoryQueryDto,
    actor: AuthenticatedUser,
  ) {
    const scope = resolveTenantSubscriptionReadScope(actor, tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope);
      await this.find(tx, scope, id);
      const where: Prisma.TrialSubscriptionEventWhereInput = {
        tenantId: scope,
        trialId: id,
      };
      const [records, total] = await Promise.all([
        tx.trialSubscriptionEvent.findMany({
          where,
          include: trialEventInclude,
          orderBy: { occurredAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.trialSubscriptionEvent.count({ where }),
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

  async extend(
    tenantId: string,
    id: string,
    dto: ExtendTrialSubscriptionDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const endsAt = new Date(dto.endsAt);
    const reason = this.reason(dto.reason);
    const fingerprint = this.fingerprint({
      action: TrialSubscriptionEventType.EXTENDED,
      tenantId,
      trialId: id,
      endsAt: dto.endsAt,
      version: dto.version,
      reason,
    });
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lockTenant(tx, tenantId);
      const duplicate = await this.idempotentTrial(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) return this.response(duplicate);

      const trial = await this.find(tx, tenantId, id);
      this.requireActiveTrial(trial);
      if (Number.isNaN(endsAt.getTime()) || endsAt <= trial.endsAt || endsAt <= new Date()) {
        throw new BadRequestException('Trial extension must move the end into the future');
      }
      const changed = await tx.trialSubscription.updateMany({
        where: { id, tenantId, version: dto.version, status: TrialSubscriptionStatus.ACTIVE },
        data: {
          endsAt,
          extendedCount: { increment: 1 },
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw this.concurrentUpdate();
      await tx.tenantSubscription.update({
        where: { tenantId_id: { tenantId, id: trial.subscriptionId } },
        data: {
          endsAt,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      const updated = await this.find(tx, tenantId, id);
      await this.appendSubscriptionEvent(tx, {
        tenantId,
        subscription: updated.subscription,
        eventType: TenantSubscriptionEventType.TRIAL_EXTENDED,
        previousStatus: TenantSubscriptionStatus.TRIAL,
        previousPlanId: trial.planId,
        actor,
        reason,
        idempotencyKey: this.subscriptionEventKey(dto.idempotencyKey),
        requestFingerprint: fingerprint,
      });
      await this.appendTrialEvent(tx, {
        tenantId,
        trial: updated,
        eventType: TrialSubscriptionEventType.EXTENDED,
        previousStatus: trial.status,
        previousEndsAt: trial.endsAt,
        previousPlanId: trial.planId,
        newPlanId: updated.planId,
        actor,
        reason,
        idempotencyKey: dto.idempotencyKey,
        requestFingerprint: fingerprint,
      });
      await this.auditTrial(tx, updated, actor, request, 'extended', {
        previousEndsAt: trial.endsAt.toISOString(),
        reason,
      });
      return this.response(updated);
    });
  }

  async expire(
    tenantId: string,
    id: string,
    dto: ExpireTrialSubscriptionDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const reason = this.reason(dto.reason);
    const fingerprint = this.fingerprint({
      action: TrialSubscriptionEventType.EXPIRED,
      tenantId,
      trialId: id,
      version: dto.version,
      reason,
    });
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lockTenant(tx, tenantId);
      const duplicate = await this.idempotentTrial(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) return this.response(duplicate);

      const trial = await this.find(tx, tenantId, id);
      const updated = await this.expireTrialInTransaction(tx, {
        tenantId,
        trial,
        version: dto.version,
        actor,
        reason,
        idempotencyKey: dto.idempotencyKey,
        requestFingerprint: fingerprint,
        request,
      });
      return this.response(updated);
    });
  }

  async convert(
    tenantId: string,
    id: string,
    dto: ConvertTrialSubscriptionDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const paidEndsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (paidEndsAt && (Number.isNaN(paidEndsAt.getTime()) || paidEndsAt <= new Date())) {
      throw new BadRequestException('Paid subscription end must be in the future');
    }
    const reason = this.reason(dto.reason);
    const fingerprint = this.fingerprint({
      action: TrialSubscriptionEventType.CONVERTED,
      tenantId,
      trialId: id,
      planId: dto.planId,
      endsAt: dto.endsAt ?? null,
      version: dto.version,
      reason,
    });
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await this.lockTenant(tx, tenantId);
      const duplicate = await this.idempotentTrial(
        tx,
        tenantId,
        dto.idempotencyKey,
        fingerprint,
      );
      if (duplicate) return this.response(duplicate);

      const plan = await this.requireActivePlan(tx, dto.planId);
      const trial = await this.find(tx, tenantId, id);
      this.requireActiveTrial(trial);
      const now = new Date();
      const changed = await tx.trialSubscription.updateMany({
        where: { id, tenantId, version: dto.version, status: TrialSubscriptionStatus.ACTIVE },
        data: {
          status: TrialSubscriptionStatus.CONVERTED,
          convertedAt: now,
          convertedPlanId: plan.id,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw this.concurrentUpdate();
      await tx.tenantSubscription.update({
        where: { tenantId_id: { tenantId, id: trial.subscriptionId } },
        data: {
          status: TenantSubscriptionStatus.ACTIVE,
          planId: plan.id,
          startsAt: now,
          endsAt: paidEndsAt,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      const updated = await this.find(tx, tenantId, id);
      await this.appendSubscriptionEvent(tx, {
        tenantId,
        subscription: updated.subscription,
        eventType: TenantSubscriptionEventType.TRIAL_CONVERTED,
        previousStatus: TenantSubscriptionStatus.TRIAL,
        previousPlanId: trial.planId,
        actor,
        reason,
        idempotencyKey: this.subscriptionEventKey(dto.idempotencyKey),
        requestFingerprint: fingerprint,
      });
      await this.appendTrialEvent(tx, {
        tenantId,
        trial: updated,
        eventType: TrialSubscriptionEventType.CONVERTED,
        previousStatus: trial.status,
        previousEndsAt: trial.endsAt,
        previousPlanId: trial.planId,
        newPlanId: plan.id,
        actor,
        reason,
        idempotencyKey: dto.idempotencyKey,
        requestFingerprint: fingerprint,
      });
      await this.auditTrial(tx, updated, actor, request, 'converted', {
        previousPlanId: trial.planId,
        reason,
      });
      return this.response(updated);
    });
  }

  async expireDue(
    dto: ExpireDueTrialsDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTenantSubscriptionMutation(actor);
    const asOf = dto.asOf ? new Date(dto.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Expiry date is invalid');
    }
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      const due = await tx.trialSubscription.findMany({
        where: {
          status: TrialSubscriptionStatus.ACTIVE,
          endsAt: { lte: asOf },
        },
        include: trialInclude,
        orderBy: { endsAt: 'asc' },
      });
      const expired: ReturnType<typeof this.response>[] = [];
      for (const trial of due) {
        await this.lockTenant(tx, trial.tenantId);
        const idempotencyKey = this.dueIdempotencyKey(dto.idempotencyKey, trial.id);
        const reason = 'Trial expired by due-trial processor';
        const fingerprint = this.fingerprint({
          action: 'EXPIRE_DUE',
          tenantId: trial.tenantId,
          trialId: trial.id,
          asOf: dto.asOf ?? null,
        });
        const duplicate = await this.idempotentTrial(
          tx,
          trial.tenantId,
          idempotencyKey,
          fingerprint,
        );
        if (duplicate) {
          expired.push(this.response(duplicate));
          continue;
        }
        const updated = await this.expireTrialInTransaction(tx, {
          tenantId: trial.tenantId,
          trial,
          actor,
          reason,
          idempotencyKey,
          requestFingerprint: fingerprint,
          request,
        });
        expired.push(this.response(updated));
      }
      return {
        processed: due.length,
        expired: expired.length,
        data: expired,
      };
    });
  }

  private async expireTrialInTransaction(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      trial: TrialRecord;
      version?: number;
      actor: AuthenticatedUser;
      reason: string | null;
      idempotencyKey: string;
      requestFingerprint: string;
      request: AuditRequestMetadata;
    },
  ): Promise<TrialRecord> {
    this.requireActiveTrial(input.trial);
    const now = new Date();
    const where: Prisma.TrialSubscriptionWhereInput = {
      id: input.trial.id,
      tenantId: input.tenantId,
      status: TrialSubscriptionStatus.ACTIVE,
      ...(input.version ? { version: input.version } : {}),
    };
    const changed = await tx.trialSubscription.updateMany({
      where,
      data: {
        status: TrialSubscriptionStatus.EXPIRED,
        expiredAt: now,
        updatedByUserId: input.actor.id,
        version: { increment: 1 },
      },
    });
    if (changed.count !== 1) throw this.concurrentUpdate();
    await tx.tenantSubscription.update({
      where: { tenantId_id: { tenantId: input.tenantId, id: input.trial.subscriptionId } },
      data: {
        status: TenantSubscriptionStatus.EXPIRED,
        endsAt: now,
        expiredAt: now,
        updatedByUserId: input.actor.id,
        version: { increment: 1 },
      },
    });
    const updated = await this.find(tx, input.tenantId, input.trial.id);
    await this.appendSubscriptionEvent(tx, {
      tenantId: input.tenantId,
      subscription: updated.subscription,
      eventType: TenantSubscriptionEventType.TRIAL_EXPIRED,
      previousStatus: TenantSubscriptionStatus.TRIAL,
      previousPlanId: input.trial.planId,
      actor: input.actor,
      reason: input.reason,
      idempotencyKey: this.subscriptionEventKey(input.idempotencyKey),
      requestFingerprint: input.requestFingerprint,
    });
    await this.appendTrialEvent(tx, {
      tenantId: input.tenantId,
      trial: updated,
      eventType: TrialSubscriptionEventType.EXPIRED,
      previousStatus: input.trial.status,
      previousEndsAt: input.trial.endsAt,
      previousPlanId: input.trial.planId,
      newPlanId: updated.planId,
      actor: input.actor,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
    });
    await this.auditTrial(tx, updated, input.actor, input.request, 'expired', {
      reason: input.reason,
    });
    return updated;
  }

  private async appendSubscriptionEvent(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      subscription: SubscriptionRecord;
      eventType: TenantSubscriptionEventType;
      previousStatus: TenantSubscriptionStatus | null;
      previousPlanId: string | null;
      actor: AuthenticatedUser;
      reason: string | null;
      idempotencyKey: string;
      requestFingerprint: string;
    },
  ) {
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
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
      },
    });
  }

  private async appendTrialEvent(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      trial: TrialRecord;
      eventType: TrialSubscriptionEventType;
      previousStatus: TrialSubscriptionStatus | null;
      previousEndsAt: Date | null;
      previousPlanId: string | null;
      newPlanId: string;
      actor: AuthenticatedUser;
      reason: string | null;
      idempotencyKey: string;
      requestFingerprint: string;
    },
  ) {
    await tx.trialSubscriptionEvent.create({
      data: {
        tenantId: input.tenantId,
        trialId: input.trial.id,
        subscriptionId: input.trial.subscriptionId,
        eventType: input.eventType,
        previousStatus: input.previousStatus,
        newStatus: input.trial.status,
        previousEndsAt: input.previousEndsAt,
        newEndsAt: input.trial.endsAt,
        previousPlanId: input.previousPlanId,
        newPlanId: input.newPlanId,
        actorUserId: input.actor.id,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey.trim(),
        requestFingerprint: input.requestFingerprint,
      },
    });
  }

  private async idempotentTrial(
    tx: Prisma.TransactionClient,
    tenantId: string,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<TrialRecord | null> {
    const event = await tx.trialSubscriptionEvent.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey: idempotencyKey.trim(),
        },
      },
      select: {
        trialId: true,
        requestFingerprint: true,
      },
    });
    if (!event) return null;
    if (event.requestFingerprint !== fingerprint) {
      throw new ConflictException('Idempotency key was already used for another trial command');
    }
    return this.find(tx, tenantId, event.trialId);
  }

  private async requireTenant(tx: Prisma.TransactionClient, tenantId: string) {
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  private async requireActivePlan(tx: Prisma.TransactionClient, planId: string) {
    const plan = await tx.subscriptionPlan.findFirst({
      where: { id: planId, status: SubscriptionPlanStatus.ACTIVE },
      select: { id: true },
    });
    if (!plan) throw new BadRequestException('Trial requires an active plan version');
    return plan;
  }

  private findCurrentSubscription(tx: Prisma.TransactionClient, tenantId: string) {
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
      select: { id: true },
    });
  }

  private async find(tx: Prisma.TransactionClient, tenantId: string, id: string) {
    const trial = await tx.trialSubscription.findFirst({
      where: { id, tenantId },
      include: trialInclude,
    });
    if (!trial) throw new NotFoundException('Trial subscription not found');
    return trial;
  }

  private requireActiveTrial(trial: TrialRecord) {
    if (trial.status !== TrialSubscriptionStatus.ACTIVE) {
      throw new ConflictException('Only active trials can transition');
    }
    if (trial.subscription.status !== TenantSubscriptionStatus.TRIAL) {
      throw new ConflictException('Trial subscription aggregate is not in trial status');
    }
  }

  private assertTrialPeriod(startsAt: Date, endsAt: Date) {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Trial period is invalid');
    }
    if (startsAt.getTime() > Date.now()) {
      throw new BadRequestException('Trial cannot start in the future');
    }
    if (endsAt <= startsAt || endsAt <= new Date()) {
      throw new BadRequestException('Trial end must be after its start and in the future');
    }
  }

  private reason(value: string | undefined): string | null {
    return value?.trim() || null;
  }

  private fingerprint(value: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private subscriptionEventKey(idempotencyKey: string): string {
    return `trial-sub:${idempotencyKey.trim()}`;
  }

  private dueIdempotencyKey(idempotencyKey: string, trialId: string): string {
    return `due:${createHash('sha256')
      .update(idempotencyKey.trim() + ':' + trialId)
      .digest('hex')}`;
  }

  private concurrentUpdate(): ConflictException {
    return new ConflictException('Trial subscription was updated by another request');
  }

  private lockTenant(tx: Prisma.TransactionClient, tenantId: string): Promise<unknown> {
    return tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'trial-subscription:' + tenantId}))`;
  }

  private async auditTrial(
    tx: Prisma.TransactionClient,
    trial: TrialRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: 'started' | 'extended' | 'expired' | 'converted',
    metadata: Prisma.InputJsonObject = {},
  ) {
    await this.audit.append(tx, {
      tenantId: trial.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: `subscription.trial.${action}`,
      targetType: 'TrialSubscription',
      targetId: trial.id,
      metadata: {
        subscriptionId: trial.subscriptionId,
        status: trial.status,
        planId: trial.planId,
        convertedPlanId: trial.convertedPlanId,
        startsAt: trial.startsAt.toISOString(),
        endsAt: trial.endsAt.toISOString(),
        version: trial.version,
        ...metadata,
      },
      ...request,
    });
  }

  private response(trial: TrialRecord) {
    return {
      id: trial.id,
      tenantId: trial.tenantId,
      subscriptionId: trial.subscriptionId,
      status: trial.status,
      startsAt: trial.startsAt,
      endsAt: trial.endsAt,
      extendedCount: trial.extendedCount,
      expiredAt: trial.expiredAt,
      convertedAt: trial.convertedAt,
      plan: {
        id: trial.plan.id,
        code: trial.plan.code,
        versionNumber: trial.plan.versionNumber,
        name: trial.plan.name,
      },
      convertedPlan: trial.convertedPlan
        ? {
            id: trial.convertedPlan.id,
            code: trial.convertedPlan.code,
            versionNumber: trial.convertedPlan.versionNumber,
            name: trial.convertedPlan.name,
          }
        : null,
      subscription: {
        id: trial.subscription.id,
        status: trial.subscription.status,
        startsAt: trial.subscription.startsAt,
        endsAt: trial.subscription.endsAt,
        expiredAt: trial.subscription.expiredAt,
        plan: {
          id: trial.subscription.plan.id,
          code: trial.subscription.plan.code,
          versionNumber: trial.subscription.plan.versionNumber,
        },
      },
      version: trial.version,
      createdAt: trial.createdAt,
      updatedAt: trial.updatedAt,
    };
  }

  private eventResponse(event: TrialEventRecord) {
    return {
      id: event.id,
      tenantId: event.tenantId,
      trialId: event.trialId,
      subscriptionId: event.subscriptionId,
      eventType: event.eventType,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      previousEndsAt: event.previousEndsAt,
      newEndsAt: event.newEndsAt,
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
