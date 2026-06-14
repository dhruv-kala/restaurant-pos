import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  DiscountApplicationSource,
  DiscountPolicyStatus,
  DiscountScope,
  DiscountValueType,
  Prisma,
  type DiscountPolicy,
} from '@prisma/client';
import { createHash } from 'node:crypto';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type { ApplyManualDiscountDto, CalculateDiscountDto } from '../dto/discount-calculation.dto';
import type {
  CreateDiscountPolicyDto,
  DiscountPolicyQueryDto,
  UpdateDiscountPolicyDto,
} from '../dto/discount-policy.dto';
import {
  requireDiscountApply,
  requireDiscountOverride,
  requireDiscountPolicyManage,
  requireDiscountPolicyRead,
  resolvePromotionsScope,
  type PromotionsScope,
} from './promotions-access.util';

type DiscountInput = Pick<
  CalculateDiscountDto,
  | 'baseAmountMinor'
  | 'currencyCode'
  | 'scope'
  | 'valueType'
  | 'percentageBps'
  | 'amountMinor'
  | 'maxDiscountMinor'
>;

export interface DiscountCalculation {
  scope: DiscountScope;
  valueType: DiscountValueType;
  percentageBps: number | null;
  amountMinor: number | null;
  currencyCode: string;
  baseAmountMinor: number;
  discountAmountMinor: number;
  finalAmountMinor: number;
  maxDiscountMinor: number | null;
}

@Injectable()
export class DiscountPoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateDiscountPolicyDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDiscountPolicyManage(actor);
    const scope = resolvePromotionsScope(actor, dto.tenantId, dto.outletId);
    this.assertPolicyValue(dto);
    this.assertValidity(dto.startsAt, dto.endsAt);
    const code = dto.code.trim().toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.assertOutlet(tx, scope.tenantId, scope.outletId);
      const existing = await tx.discountPolicy.findUnique({
        where: { tenantId_code: { tenantId: scope.tenantId, code } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Discount policy code already exists');
      }

      const policy = await tx.discountPolicy.create({
        data: {
          tenantId: scope.tenantId,
          outletId: scope.outletId ?? null,
          code,
          name: this.requiredText(dto.name, 'Policy name'),
          description: this.optionalText(dto.description),
          scope: dto.scope,
          valueType: dto.valueType,
          percentageBps: dto.valueType === DiscountValueType.PERCENTAGE ? dto.percentageBps : null,
          amountMinor: dto.valueType === DiscountValueType.FIXED_AMOUNT ? dto.amountMinor : null,
          currencyCode: dto.valueType === DiscountValueType.FIXED_AMOUNT ? dto.currencyCode : null,
          maxDiscountMinor: dto.maxDiscountMinor ?? null,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          requiresManagerApproval: dto.requiresManagerApproval,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
      });
      await this.auditPolicy(tx, policy, actor, request, 'promotions.discount_policy.created');
      return this.policyResponse(policy);
    });
  }

  async list(query: DiscountPolicyQueryDto, actor: AuthenticatedUser) {
    requireDiscountPolicyRead(actor);
    const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.policyWhere(query, scope);
      const [policies, total] = await Promise.all([
        tx.discountPolicy.findMany({
          where,
          orderBy: [{ code: 'asc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.discountPolicy.count({ where }),
      ]);
      return {
        data: policies.map((policy) => this.policyResponse(policy)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: DiscountPolicyQueryDto, actor: AuthenticatedUser) {
    requireDiscountPolicyRead(actor);
    const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const policy = await this.findPolicy(tx, scope, id);
      return this.policyResponse(policy);
    });
  }

  async update(
    id: string,
    dto: UpdateDiscountPolicyDto,
    query: DiscountPolicyQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDiscountPolicyManage(actor);
    return this.prisma.$transaction(async (tx) => {
      const initialScope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
      await applyDatabaseRequestContext(tx, actor, initialScope.tenantId);
      const existing = await this.findPolicy(tx, initialScope, id);
      if (initialScope.managerOutletOnly && existing.outletId !== initialScope.outletId) {
        throw new ForbiddenException('Managers can manage only outlet-scoped discount policies');
      }
      const scope = resolvePromotionsScope(
        actor,
        existing.tenantId,
        dto.outletId ?? existing.outletId,
      );
      await this.assertOutlet(tx, scope.tenantId, dto.outletId ?? existing.outletId ?? undefined);
      const next = this.nextPolicyValues(existing, dto);
      this.assertPolicyValue(next);
      this.assertValidity(next.startsAt?.toISOString(), next.endsAt?.toISOString());
      const updated = await tx.discountPolicy.updateMany({
        where: { tenantId: existing.tenantId, id, version: dto.version },
        data: {
          outletId: dto.outletId === undefined ? existing.outletId : dto.outletId,
          name: next.name,
          description: next.description,
          scope: next.scope,
          valueType: next.valueType,
          percentageBps: next.percentageBps,
          amountMinor: next.amountMinor,
          currencyCode: next.currencyCode,
          maxDiscountMinor: next.maxDiscountMinor,
          startsAt: next.startsAt,
          endsAt: next.endsAt,
          requiresManagerApproval: next.requiresManagerApproval,
          status: dto.status ?? existing.status,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Discount policy was updated by another request');
      }
      const policy = await tx.discountPolicy.findUniqueOrThrow({ where: { id } });
      await this.auditPolicy(tx, policy, actor, request, 'promotions.discount_policy.updated');
      return this.policyResponse(policy);
    });
  }

  async calculate(dto: CalculateDiscountDto, actor: AuthenticatedUser) {
    requireDiscountPolicyRead(actor);
    const scope = resolvePromotionsScope(actor, dto.tenantId, dto.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const policy = dto.policyId
        ? await this.activePolicyForCalculation(tx, scope, dto.policyId, dto.currencyCode)
        : null;
      if (!policy && dto.valueType !== undefined) {
        requireDiscountApply(actor);
      }
      return this.calculateResponse(this.calculateDiscount(dto, policy));
    });
  }

  async applyManual(
    dto: ApplyManualDiscountDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDiscountApply(actor);
    const scope = resolvePromotionsScope(actor, dto.tenantId, dto.outletId);
    const fingerprint = fingerprintPayload({
      tenantId: scope.tenantId,
      dto,
      actorId: actor.id,
    });

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await tx.discountApplication.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: scope.tenantId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) {
          throw new ConflictException('Idempotency key was already used with a different request');
        }
        return this.applicationResponse(existing);
      }

      const policy = dto.policyId
        ? await this.activePolicyForCalculation(tx, scope, dto.policyId, dto.currencyCode)
        : null;
      if (!policy) {
        requireDiscountOverride(actor);
      }
      if (policy?.requiresManagerApproval) {
        requireDiscountOverride(actor);
      }

      await this.assertOutlet(tx, scope.tenantId, scope.outletId);
      await this.assertTargets(tx, scope, dto.billId, dto.orderId);
      const calculation = this.calculateDiscount(dto, policy);
      const application = await tx.discountApplication.create({
        data: {
          tenantId: scope.tenantId,
          outletId: scope.outletId ?? null,
          policyId: policy?.id ?? null,
          billId: dto.billId ?? null,
          orderId: dto.orderId ?? null,
          source: policy ? DiscountApplicationSource.POLICY : DiscountApplicationSource.MANUAL,
          scope: calculation.scope,
          valueType: calculation.valueType,
          percentageBpsSnapshot: calculation.percentageBps,
          amountMinorSnapshot: calculation.amountMinor,
          currencyCode: calculation.currencyCode,
          baseAmountMinor: calculation.baseAmountMinor,
          discountAmountMinor: calculation.discountAmountMinor,
          finalAmountMinor: calculation.finalAmountMinor,
          policyCodeSnapshot: policy?.code ?? null,
          policyNameSnapshot: policy?.name ?? null,
          reason: this.optionalText(dto.reason),
          calculationSnapshot: {
            ...calculation,
            policyId: policy?.id ?? null,
            metadata: dto.metadata ?? null,
          } as Prisma.InputJsonValue,
          idempotencyKey: dto.idempotencyKey,
          requestFingerprint: fingerprint,
          appliedByUserId: actor.id,
        },
      });
      await this.audit.append(tx, {
        tenantId: scope.tenantId,
        outletId: application.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'promotions.discount.applied',
        targetType: 'DiscountApplication',
        targetId: application.id,
        metadata: {
          policyId: application.policyId,
          billId: application.billId,
          orderId: application.orderId,
          source: application.source,
          discountAmountMinor: application.discountAmountMinor,
        },
        idempotencyKey: dto.idempotencyKey,
        ...request,
      });
      return this.applicationResponse(application);
    });
  }

  private policyWhere(
    query: DiscountPolicyQueryDto,
    scope: PromotionsScope,
  ): Prisma.DiscountPolicyWhereInput {
    const search = query.search?.trim();
    const and: Prisma.DiscountPolicyWhereInput[] = [];
    if (scope.managerOutletOnly) {
      and.push({ OR: [{ outletId: null }, { outletId: scope.outletId }] });
    } else if (scope.outletId) {
      and.push({ outletId: scope.outletId });
    }
    if (search) {
      and.push({
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    return {
      tenantId: scope.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.scope ? { scope: query.scope } : {}),
      ...(and.length > 0 ? { AND: and } : {}),
    };
  }

  private async findPolicy(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    id: string,
  ): Promise<DiscountPolicy> {
    const policy = await tx.discountPolicy.findFirst({
      where: {
        tenantId: scope.tenantId,
        id,
        ...(scope.managerOutletOnly
          ? { OR: [{ outletId: null }, { outletId: scope.outletId }] }
          : scope.outletId
            ? { outletId: scope.outletId }
            : {}),
      },
    });
    if (!policy) throw new NotFoundException('Discount policy not found');
    return policy;
  }

  private async activePolicyForCalculation(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    policyId: string,
    currencyCode: string,
  ): Promise<DiscountPolicy> {
    const policy = await this.findPolicy(tx, scope, policyId);
    if (policy.status !== DiscountPolicyStatus.ACTIVE) {
      throw new ConflictException('Discount policy is inactive');
    }
    const now = Date.now();
    if (policy.startsAt && policy.startsAt.getTime() > now) {
      throw new ConflictException('Discount policy is not active yet');
    }
    if (policy.endsAt && policy.endsAt.getTime() <= now) {
      throw new ConflictException('Discount policy has expired');
    }
    if (policy.currencyCode && policy.currencyCode !== currencyCode) {
      throw new BadRequestException('Discount policy currency does not match calculation currency');
    }
    return policy;
  }

  private calculateDiscount(
    dto: DiscountInput,
    policy: DiscountPolicy | null,
  ): DiscountCalculation {
    const valueType = policy?.valueType ?? dto.valueType;
    if (!valueType) {
      throw new BadRequestException('valueType is required when policyId is not provided');
    }
    const scope = policy?.scope ?? dto.scope;
    if (!scope) {
      throw new BadRequestException('scope is required when policyId is not provided');
    }
    const percentageBps = policy?.percentageBps ?? dto.percentageBps ?? null;
    const amountMinor = policy?.amountMinor ?? dto.amountMinor ?? null;
    const maxDiscountMinor = policy?.maxDiscountMinor ?? dto.maxDiscountMinor ?? null;
    const currencyCode = dto.currencyCode;

    if (valueType === DiscountValueType.PERCENTAGE && percentageBps === null) {
      throw new BadRequestException('percentageBps is required for percentage discounts');
    }
    if (valueType === DiscountValueType.FIXED_AMOUNT && amountMinor === null) {
      throw new BadRequestException('amountMinor is required for fixed amount discounts');
    }
    if (policy?.currencyCode && policy.currencyCode !== currencyCode) {
      throw new BadRequestException('Discount currency mismatch');
    }

    const rawDiscount =
      valueType === DiscountValueType.PERCENTAGE
        ? Math.floor((dto.baseAmountMinor * percentageBps!) / 10_000)
        : amountMinor!;
    const cappedByBase = Math.min(rawDiscount, dto.baseAmountMinor);
    const discountAmountMinor =
      maxDiscountMinor === null ? cappedByBase : Math.min(cappedByBase, maxDiscountMinor);
    return {
      scope,
      valueType,
      percentageBps: valueType === DiscountValueType.PERCENTAGE ? percentageBps : null,
      amountMinor: valueType === DiscountValueType.FIXED_AMOUNT ? amountMinor : null,
      currencyCode,
      baseAmountMinor: dto.baseAmountMinor,
      discountAmountMinor,
      finalAmountMinor: dto.baseAmountMinor - discountAmountMinor,
      maxDiscountMinor,
    };
  }

  private assertPolicyValue(input: {
    valueType: DiscountValueType;
    percentageBps?: number | null;
    amountMinor?: number | null;
    currencyCode?: string | null;
  }): void {
    if (input.valueType === DiscountValueType.PERCENTAGE) {
      if (!input.percentageBps || input.amountMinor || input.currencyCode) {
        throw new BadRequestException(
          'Percentage policies require percentageBps and must not set amountMinor or currencyCode',
        );
      }
      return;
    }
    if (!input.amountMinor || !input.currencyCode || input.percentageBps) {
      throw new BadRequestException(
        'Fixed amount policies require amountMinor and currencyCode and must not set percentageBps',
      );
    }
  }

  private assertValidity(startsAt?: string | null, endsAt?: string | null): void {
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  private nextPolicyValues(existing: DiscountPolicy, dto: UpdateDiscountPolicyDto) {
    const valueType = dto.valueType ?? existing.valueType;
    return {
      name: dto.name === undefined ? existing.name : this.requiredText(dto.name, 'Policy name'),
      description:
        dto.description === undefined ? existing.description : this.optionalText(dto.description),
      scope: dto.scope ?? existing.scope,
      valueType,
      percentageBps:
        valueType === DiscountValueType.PERCENTAGE
          ? (dto.percentageBps ?? existing.percentageBps)
          : null,
      amountMinor:
        valueType === DiscountValueType.FIXED_AMOUNT
          ? (dto.amountMinor ?? existing.amountMinor)
          : null,
      currencyCode:
        valueType === DiscountValueType.FIXED_AMOUNT
          ? (dto.currencyCode ?? existing.currencyCode)
          : null,
      maxDiscountMinor:
        dto.maxDiscountMinor === undefined ? existing.maxDiscountMinor : dto.maxDiscountMinor,
      startsAt: dto.startsAt === undefined ? existing.startsAt : this.optionalDate(dto.startsAt),
      endsAt: dto.endsAt === undefined ? existing.endsAt : this.optionalDate(dto.endsAt),
      requiresManagerApproval: dto.requiresManagerApproval ?? existing.requiresManagerApproval,
    };
  }

  private async assertOutlet(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId?: string | null,
  ): Promise<void> {
    if (!outletId) return;
    const outlet = await tx.outlet.findFirst({
      where: { tenantId, id: outletId, deletedAt: null },
      select: { id: true },
    });
    if (!outlet) throw new BadRequestException('Outlet is not active for this tenant');
  }

  private async assertTargets(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    billId?: string,
    orderId?: string,
  ): Promise<void> {
    if (!billId && !orderId) return;
    if (billId) {
      const bill = await tx.bill.findFirst({
        where: {
          tenantId: scope.tenantId,
          id: billId,
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        select: { id: true, outletId: true },
      });
      if (!bill) throw new NotFoundException('Bill not found for discount application');
      if (scope.outletId === undefined) scope.outletId = bill.outletId;
    }
    if (orderId) {
      const order = await tx.order.findFirst({
        where: {
          tenantId: scope.tenantId,
          id: orderId,
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        select: { id: true, outletId: true },
      });
      if (!order) throw new NotFoundException('Order not found for discount application');
      if (scope.outletId === undefined) scope.outletId = order.outletId;
    }
  }

  private async auditPolicy(
    tx: Prisma.TransactionClient,
    policy: DiscountPolicy,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: policy.tenantId,
      outletId: policy.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'DiscountPolicy',
      targetId: policy.id,
      result: AuditResult.SUCCESS,
      metadata: {
        code: policy.code,
        status: policy.status,
        scope: policy.scope,
        valueType: policy.valueType,
      },
      ...request,
    });
  }

  private policyResponse(policy: DiscountPolicy) {
    return {
      id: policy.id,
      tenantId: policy.tenantId,
      outletId: policy.outletId,
      code: policy.code,
      name: policy.name,
      description: policy.description,
      scope: policy.scope,
      valueType: policy.valueType,
      percentageBps: policy.percentageBps,
      amountMinor: policy.amountMinor,
      currencyCode: policy.currencyCode,
      maxDiscountMinor: policy.maxDiscountMinor,
      startsAt: policy.startsAt?.toISOString() ?? null,
      endsAt: policy.endsAt?.toISOString() ?? null,
      requiresManagerApproval: policy.requiresManagerApproval,
      status: policy.status,
      version: policy.version,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  private calculateResponse(calculation: DiscountCalculation) {
    return calculation;
  }

  private applicationResponse(application: {
    id: string;
    tenantId: string;
    outletId: string | null;
    policyId: string | null;
    billId: string | null;
    orderId: string | null;
    source: DiscountApplicationSource;
    scope: string;
    valueType: DiscountValueType;
    percentageBpsSnapshot: number | null;
    amountMinorSnapshot: number | null;
    currencyCode: string;
    baseAmountMinor: number;
    discountAmountMinor: number;
    finalAmountMinor: number;
    policyCodeSnapshot: string | null;
    policyNameSnapshot: string | null;
    reason: string | null;
    calculationSnapshot: Prisma.JsonValue;
    idempotencyKey: string;
    createdAt: Date;
  }) {
    return {
      id: application.id,
      tenantId: application.tenantId,
      outletId: application.outletId,
      policyId: application.policyId,
      billId: application.billId,
      orderId: application.orderId,
      source: application.source,
      scope: application.scope,
      valueType: application.valueType,
      percentageBpsSnapshot: application.percentageBpsSnapshot,
      amountMinorSnapshot: application.amountMinorSnapshot,
      currencyCode: application.currencyCode,
      baseAmountMinor: application.baseAmountMinor,
      discountAmountMinor: application.discountAmountMinor,
      finalAmountMinor: application.finalAmountMinor,
      policyCodeSnapshot: application.policyCodeSnapshot,
      policyNameSnapshot: application.policyNameSnapshot,
      reason: application.reason,
      calculationSnapshot: application.calculationSnapshot,
      idempotencyKey: application.idempotencyKey,
      createdAt: application.createdAt.toISOString(),
    };
  }

  private requiredText(value: string, label: string): string {
    const trimmed = value.trim();
    if (!trimmed) throw new BadRequestException(`${label} is required`);
    return trimmed;
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private optionalDate(value?: string | null): Date | null {
    return value ? new Date(value) : null;
  }
}

function fingerprintPayload(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
