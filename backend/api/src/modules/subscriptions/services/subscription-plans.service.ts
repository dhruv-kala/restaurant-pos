import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionPlanStatus, type SubscriptionPlan } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  ChangeSubscriptionPlanStatusDto,
  CreateSubscriptionPlanDto,
  ReplaceSubscriptionPlanFeaturesDto,
  SubscriptionPlanFeatureInputDto,
  SubscriptionPlanQueryDto,
  UpdateSubscriptionPlanDto,
} from '../dto/subscription-plan.dto';
import { requireSubscriptionPlanAdministration } from './subscription-plan-access.util';

const planInclude = {
  features: {
    orderBy: { featureKey: 'asc' },
  },
} satisfies Prisma.SubscriptionPlanInclude;

type PlanRecord = Prisma.SubscriptionPlanGetPayload<{
  include: typeof planInclude;
}>;

@Injectable()
export class SubscriptionPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateSubscriptionPlanDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireSubscriptionPlanAdministration(actor);
    const code = dto.code.trim().toLowerCase();
    this.assertUniqueFeatures(dto.features);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      await this.lockCode(tx, code);
      const existing = await tx.subscriptionPlan.findFirst({
        where: { code },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Subscription plan code already exists');
      }

      const plan = await tx.subscriptionPlan.create({
        data: {
          code,
          versionNumber: 1,
          name: this.requiredText(dto.name, 'Plan name'),
          description: this.optionalText(dto.description),
          billingInterval: dto.billingInterval,
          priceMinor: dto.priceMinor,
          currencyCode: dto.currencyCode,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
          features: {
            create: dto.features.map((feature) => this.featureData(feature)),
          },
        },
        include: planInclude,
      });
      await this.auditChange(tx, plan, actor, request, 'created');
      return this.response(plan);
    });
  }

  async list(query: SubscriptionPlanQueryDto, actor: AuthenticatedUser) {
    requireSubscriptionPlanAdministration(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      const search = query.search?.trim();
      const where: Prisma.SubscriptionPlanWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.code ? { code: query.code.trim().toLowerCase() } : {}),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [plans, total] = await Promise.all([
        tx.subscriptionPlan.findMany({
          where,
          include: planInclude,
          orderBy: [{ code: 'asc' }, { versionNumber: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.subscriptionPlan.count({ where }),
      ]);
      return {
        data: plans.map((plan) => this.response(plan)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, actor: AuthenticatedUser) {
    requireSubscriptionPlanAdministration(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      return this.response(await this.find(tx, id));
    });
  }

  async versions(id: string, actor: AuthenticatedUser) {
    requireSubscriptionPlanAdministration(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      const plan = await this.find(tx, id);
      const versions = await tx.subscriptionPlan.findMany({
        where: { code: plan.code },
        include: planInclude,
        orderBy: { versionNumber: 'desc' },
      });
      return versions.map((version) => this.response(version));
    });
  }

  async update(
    id: string,
    dto: UpdateSubscriptionPlanDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireSubscriptionPlanAdministration(actor);
    this.assertPlanChanges(dto);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      const initial = await this.find(tx, id);
      await this.lockCode(tx, initial.code);
      const current = await this.find(tx, id);
      this.assertVersion(current, dto.version);

      if (current.activatedAt !== null) {
        const claimed = await tx.subscriptionPlan.updateMany({
          where: { id, version: dto.version },
          data: {
            updatedByUserId: actor.id,
            version: { increment: 1 },
          },
        });
        if (claimed.count !== 1) {
          throw this.concurrentUpdate();
        }
        const nextVersion = await this.cloneVersion(tx, current, dto, actor.id);
        await this.auditChange(tx, nextVersion, actor, request, 'version_created', {
          sourcePlanId: current.id,
          sourceVersionNumber: current.versionNumber,
        });
        return this.response(nextVersion);
      }

      const changed = await tx.subscriptionPlan.updateMany({
        where: {
          id,
          version: dto.version,
          status: SubscriptionPlanStatus.DRAFT,
        },
        data: {
          ...this.planChanges(dto),
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw this.concurrentUpdate();
      }
      const updated = await this.find(tx, id);
      await this.auditChange(tx, updated, actor, request, 'updated');
      return this.response(updated);
    });
  }

  async replaceFeatures(
    id: string,
    dto: ReplaceSubscriptionPlanFeaturesDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireSubscriptionPlanAdministration(actor);
    this.assertUniqueFeatures(dto.features);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      const plan = await this.find(tx, id);
      if (plan.activatedAt !== null) {
        throw new ConflictException(
          'Activated plan versions are immutable; create a new draft version first',
        );
      }
      const claimed = await tx.subscriptionPlan.updateMany({
        where: {
          id,
          version: dto.version,
          status: SubscriptionPlanStatus.DRAFT,
        },
        data: {
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (claimed.count !== 1) {
        throw this.concurrentUpdate();
      }
      await tx.subscriptionPlanFeature.deleteMany({ where: { planId: id } });
      if (dto.features.length > 0) {
        await tx.subscriptionPlanFeature.createMany({
          data: dto.features.map((feature) => ({
            planId: id,
            ...this.featureData(feature),
          })),
        });
      }
      const updated = await this.find(tx, id);
      await this.auditChange(tx, updated, actor, request, 'features_replaced');
      return this.response(updated);
    });
  }

  async activate(
    id: string,
    dto: ChangeSubscriptionPlanStatusDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireSubscriptionPlanAdministration(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      const initial = await this.find(tx, id);
      await this.lockCode(tx, initial.code);
      const plan = await this.find(tx, id);
      this.assertVersion(plan, dto.version);
      if (plan.status !== SubscriptionPlanStatus.DRAFT) {
        throw new ConflictException('Only draft plan versions can be activated');
      }

      const now = new Date();
      const previous = await tx.subscriptionPlan.findFirst({
        where: { code: plan.code, status: SubscriptionPlanStatus.ACTIVE },
        include: planInclude,
      });
      if (previous) {
        const inactive = await tx.subscriptionPlan.update({
          where: { id: previous.id },
          data: {
            status: SubscriptionPlanStatus.INACTIVE,
            deactivatedAt: now,
            updatedByUserId: actor.id,
            version: { increment: 1 },
          },
          include: planInclude,
        });
        await this.auditChange(tx, inactive, actor, request, 'deactivated', {
          replacementPlanId: id,
        });
      }

      const activated = await tx.subscriptionPlan.updateMany({
        where: {
          id,
          version: dto.version,
          status: SubscriptionPlanStatus.DRAFT,
        },
        data: {
          status: SubscriptionPlanStatus.ACTIVE,
          activatedAt: now,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (activated.count !== 1) {
        throw this.concurrentUpdate();
      }
      const active = await this.find(tx, id);
      await this.auditChange(tx, active, actor, request, 'activated', {
        replacedPlanId: previous?.id ?? null,
      });
      return this.response(active);
    });
  }

  async deactivate(
    id: string,
    dto: ChangeSubscriptionPlanStatusDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireSubscriptionPlanAdministration(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor);
      const plan = await this.find(tx, id);
      this.assertVersion(plan, dto.version);
      if (plan.status !== SubscriptionPlanStatus.ACTIVE) {
        throw new ConflictException('Only active plan versions can be deactivated');
      }
      const deactivated = await tx.subscriptionPlan.updateMany({
        where: {
          id,
          version: dto.version,
          status: SubscriptionPlanStatus.ACTIVE,
        },
        data: {
          status: SubscriptionPlanStatus.INACTIVE,
          deactivatedAt: new Date(),
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (deactivated.count !== 1) {
        throw this.concurrentUpdate();
      }
      const inactive = await this.find(tx, id);
      await this.auditChange(tx, inactive, actor, request, 'deactivated');
      return this.response(inactive);
    });
  }

  private async cloneVersion(
    tx: Prisma.TransactionClient,
    current: PlanRecord,
    dto: UpdateSubscriptionPlanDto,
    actorUserId: string,
  ): Promise<PlanRecord> {
    const latest = await tx.subscriptionPlan.aggregate({
      where: { code: current.code },
      _max: { versionNumber: true },
    });
    return tx.subscriptionPlan.create({
      data: {
        code: current.code,
        versionNumber: (latest._max.versionNumber ?? current.versionNumber) + 1,
        name: dto.name ? this.requiredText(dto.name, 'Plan name') : current.name,
        description:
          dto.description !== undefined ? this.optionalText(dto.description) : current.description,
        billingInterval: dto.billingInterval ?? current.billingInterval,
        priceMinor: dto.priceMinor ?? current.priceMinor,
        currencyCode: dto.currencyCode ?? current.currencyCode,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        features: {
          create: current.features.map((feature) => ({
            featureKey: feature.featureKey,
            isEnabled: feature.isEnabled,
            limitValue: feature.limitValue,
            metadata: feature.metadata ?? Prisma.JsonNull,
          })),
        },
      },
      include: planInclude,
    });
  }

  private planChanges(dto: UpdateSubscriptionPlanDto): Prisma.SubscriptionPlanUncheckedUpdateInput {
    return {
      ...(dto.name !== undefined ? { name: this.requiredText(dto.name, 'Plan name') } : {}),
      ...(dto.description !== undefined ? { description: this.optionalText(dto.description) } : {}),
      ...(dto.billingInterval !== undefined ? { billingInterval: dto.billingInterval } : {}),
      ...(dto.priceMinor !== undefined ? { priceMinor: dto.priceMinor } : {}),
      ...(dto.currencyCode !== undefined ? { currencyCode: dto.currencyCode } : {}),
    };
  }

  private assertPlanChanges(dto: UpdateSubscriptionPlanDto): void {
    if (
      [dto.name, dto.description, dto.billingInterval, dto.priceMinor, dto.currencyCode].every(
        (value) => value === undefined,
      )
    ) {
      throw new BadRequestException('At least one plan field must be changed');
    }
  }

  private assertUniqueFeatures(features: SubscriptionPlanFeatureInputDto[]): void {
    const keys = features.map((feature) => feature.featureKey.trim().toLowerCase());
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Feature keys must be unique within a plan');
    }
  }

  private featureData(feature: SubscriptionPlanFeatureInputDto) {
    return {
      featureKey: feature.featureKey.trim().toLowerCase(),
      isEnabled: feature.isEnabled,
      limitValue: feature.limitValue ?? null,
      metadata: feature.metadata ? (feature.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    };
  }

  private requiredText(value: string, label: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${label} is required`);
    }
    return normalized;
  }

  private optionalText(value: string | null | undefined): string | null {
    return value?.trim() || null;
  }

  private assertVersion(plan: SubscriptionPlan, expectedVersion: number): void {
    if (plan.version !== expectedVersion) {
      throw this.concurrentUpdate();
    }
  }

  private concurrentUpdate(): ConflictException {
    return new ConflictException('Subscription plan was updated by another request');
  }

  private async find(tx: Prisma.TransactionClient, id: string): Promise<PlanRecord> {
    const plan = await tx.subscriptionPlan.findUnique({
      where: { id },
      include: planInclude,
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    return plan;
  }

  private lockCode(tx: Prisma.TransactionClient, code: string): Promise<unknown> {
    return tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'subscription-plan:' + code}))`;
  }

  private async auditChange(
    tx: Prisma.TransactionClient,
    plan: PlanRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action:
      | 'created'
      | 'updated'
      | 'version_created'
      | 'features_replaced'
      | 'activated'
      | 'deactivated',
    extraMetadata: Prisma.InputJsonObject = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: null,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: `subscription.plan.${action}`,
      targetType: 'SubscriptionPlan',
      targetId: plan.id,
      metadata: {
        code: plan.code,
        versionNumber: plan.versionNumber,
        status: plan.status,
        billingInterval: plan.billingInterval,
        priceMinor: plan.priceMinor,
        currencyCode: plan.currencyCode,
        featureCount: plan.features.length,
        ...extraMetadata,
      },
      ...request,
    });
  }

  private response(plan: PlanRecord) {
    return {
      id: plan.id,
      code: plan.code,
      versionNumber: plan.versionNumber,
      name: plan.name,
      description: plan.description,
      billingInterval: plan.billingInterval,
      priceMinor: plan.priceMinor,
      currencyCode: plan.currencyCode,
      status: plan.status,
      features: plan.features.map((feature) => ({
        id: feature.id,
        featureKey: feature.featureKey,
        isEnabled: feature.isEnabled,
        limitValue: feature.limitValue,
        metadata: feature.metadata,
        createdAt: feature.createdAt,
        updatedAt: feature.updatedAt,
      })),
      activatedAt: plan.activatedAt,
      deactivatedAt: plan.deactivatedAt,
      version: plan.version,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
