import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CouponStatus,
  CouponType,
  DiscountPolicyStatus,
  DiscountScope,
  DiscountValueType,
  Prisma,
  PromotionCampaignOutletScope,
  PromotionCampaignStatus,
  PromotionRuleType,
  type Coupon,
  type DiscountPolicy,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  DiscountEligibilityItemDto,
  EvaluateDiscountEligibilityDto,
} from '../dto/discount-eligibility.dto';
import {
  requireEligibilityEvaluate,
  resolvePromotionsScope,
  type PromotionsScope,
} from './promotions-access.util';

const campaignInclude = {
  outlets: { orderBy: { outletId: 'asc' as const } },
  rules: { orderBy: [{ priority: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.PromotionCampaignInclude;

type DiscountPolicyRecord = DiscountPolicy;
type CouponRecord = Coupon;
type CampaignRecord = Prisma.PromotionCampaignGetPayload<{ include: typeof campaignInclude }>;
type CampaignRuleRecord = CampaignRecord['rules'][number];

type CandidateSource = 'DISCOUNT_POLICY' | 'COUPON' | 'CAMPAIGN_RULE';

export interface EligibilityCalculation {
  baseAmountMinor: number;
  discountAmountMinor: number;
  finalAmountMinor: number;
  currencyCode: string;
}

export interface EligibilityCandidate {
  source: CandidateSource;
  id: string;
  parentId?: string;
  code?: string;
  name: string;
  eligible: boolean;
  selected: boolean;
  reasons: string[];
  priority: number;
  calculation: EligibilityCalculation | null;
  snapshot: Record<string, unknown>;
}

export interface EligibilityEvaluationResponse {
  eligible: boolean;
  selected: EligibilityCandidate[];
  rejected: EligibilityCandidate[];
  candidates: EligibilityCandidate[];
  stacking: {
    mode: 'BEST_SINGLE_DISCOUNT';
    maxApplications: 1;
    rejectedReason: 'STACKING_CONFLICT';
  };
  context: {
    tenantId: string;
    outletId: string | null;
    customerId: string | null;
    orderId: string | null;
    billId: string | null;
    evaluatedAt: string;
    subtotalMinor: number;
    currencyCode: string;
  };
  createsRedemption: false;
}

export interface EligibilityEvaluationOptions {
  includeDefaultPolicies?: boolean;
  includeDefaultCampaigns?: boolean;
}

@Injectable()
export class DiscountEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    dto: EvaluateDiscountEligibilityDto,
    actor: AuthenticatedUser,
  ): Promise<EligibilityEvaluationResponse> {
    requireEligibilityEvaluate(actor);
    const scope = resolvePromotionsScope(actor, dto.tenantId, dto.outletId);
    const evaluatedAt = dto.evaluatedAt ? new Date(dto.evaluatedAt) : new Date();
    if (Number.isNaN(evaluatedAt.getTime())) {
      throw new BadRequestException('evaluatedAt must be a valid ISO timestamp');
    }

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.evaluateInTransaction(tx, dto, actor, scope, evaluatedAt);
    });
  }

  async evaluateInTransaction(
    tx: Prisma.TransactionClient,
    dto: EvaluateDiscountEligibilityDto,
    actor: AuthenticatedUser,
    scope: PromotionsScope,
    evaluatedAt: Date,
    options: EligibilityEvaluationOptions = {},
  ): Promise<EligibilityEvaluationResponse> {
    requireEligibilityEvaluate(actor);
    await this.assertContextRecords(tx, scope, dto);

    const [policies, coupons, campaigns] = await Promise.all([
      this.loadPolicies(tx, scope, dto, evaluatedAt, options),
      this.loadCoupons(tx, scope, dto),
      this.loadCampaigns(tx, scope, dto, evaluatedAt, options),
    ]);

    const candidates = [
      ...policies.map((policy) => this.policyCandidate(policy, dto, evaluatedAt)),
      ...coupons.map((coupon) => this.couponCandidate(coupon, dto, evaluatedAt)),
      ...this.missingCouponCandidates(dto, coupons),
      ...campaigns.flatMap((campaign) =>
        campaign.rules.map((rule) => this.ruleCandidate(campaign, rule, dto, evaluatedAt)),
      ),
    ];
    const withSelection = this.applyStacking(candidates);
    return {
      eligible: withSelection.some((candidate) => candidate.selected),
      selected: withSelection.filter((candidate) => candidate.selected),
      rejected: withSelection.filter((candidate) => !candidate.selected),
      candidates: withSelection,
      stacking: {
        mode: 'BEST_SINGLE_DISCOUNT',
        maxApplications: 1,
        rejectedReason: 'STACKING_CONFLICT',
      },
      context: {
        tenantId: scope.tenantId,
        outletId: scope.outletId ?? null,
        customerId: dto.customerId ?? null,
        orderId: dto.orderId ?? null,
        billId: dto.billId ?? null,
        evaluatedAt: evaluatedAt.toISOString(),
        subtotalMinor: dto.subtotalMinor,
        currencyCode: dto.currencyCode,
      },
      createsRedemption: false,
    };
  }

  private async assertContextRecords(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    dto: EvaluateDiscountEligibilityDto,
  ): Promise<void> {
    if (scope.outletId) {
      const outlet = await tx.outlet.findFirst({
        where: { tenantId: scope.tenantId, id: scope.outletId, deletedAt: null },
        select: { id: true },
      });
      if (!outlet) throw new BadRequestException('Outlet is not active for this tenant');
    }
    if (dto.customerId) {
      const customer = await tx.customer.findFirst({
        where: { tenantId: scope.tenantId, id: dto.customerId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) throw new BadRequestException('Customer is not active for this tenant');
    }
    if (dto.orderId) {
      const order = await tx.order.findFirst({
        where: {
          tenantId: scope.tenantId,
          id: dto.orderId,
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        select: { id: true },
      });
      if (!order) throw new BadRequestException('Order is not valid for this tenant/outlet');
    }
    if (dto.billId) {
      const bill = await tx.bill.findFirst({
        where: {
          tenantId: scope.tenantId,
          id: dto.billId,
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        select: { id: true },
      });
      if (!bill) throw new BadRequestException('Bill is not valid for this tenant/outlet');
    }
  }

  private loadPolicies(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    dto: EvaluateDiscountEligibilityDto,
    evaluatedAt: Date,
    options: EligibilityEvaluationOptions,
  ): Promise<DiscountPolicyRecord[]> {
    const ids = unique(dto.discountPolicyIds ?? []);
    if (ids.length === 0 && options.includeDefaultPolicies === false) {
      return Promise.resolve([]);
    }
    const filters: Prisma.DiscountPolicyWhereInput[] = [];
    if (ids.length === 0) {
      filters.push(
        { OR: [{ startsAt: null }, { startsAt: { lte: evaluatedAt } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: evaluatedAt } }] },
      );
    }
    if (scope.outletId) {
      filters.push({ OR: [{ outletId: null }, { outletId: scope.outletId }] });
    }
    return tx.discountPolicy.findMany({
      where: {
        tenantId: scope.tenantId,
        ...(ids.length > 0 ? { id: { in: ids } } : { status: DiscountPolicyStatus.ACTIVE }),
        ...(filters.length > 0 ? { AND: filters } : {}),
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  private loadCoupons(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    dto: EvaluateDiscountEligibilityDto,
  ): Promise<CouponRecord[]> {
    const codes = unique((dto.couponCodes ?? []).map((code) => normalizeCouponCode(code))).filter(
      Boolean,
    );
    if (codes.length === 0) return Promise.resolve([]);
    return tx.coupon.findMany({
      where: {
        tenantId: scope.tenantId,
        code: { in: codes },
        ...(scope.outletId ? { OR: [{ outletId: null }, { outletId: scope.outletId }] } : {}),
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  private loadCampaigns(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    dto: EvaluateDiscountEligibilityDto,
    evaluatedAt: Date,
    options: EligibilityEvaluationOptions,
  ): Promise<CampaignRecord[]> {
    const ids = unique(dto.campaignIds ?? []);
    if (ids.length === 0 && options.includeDefaultCampaigns === false) {
      return Promise.resolve([]);
    }
    return tx.promotionCampaign.findMany({
      where: {
        tenantId: scope.tenantId,
        ...(ids.length > 0 ? { id: { in: ids } } : {}),
        status: PromotionCampaignStatus.ACTIVE,
        startsAt: { lte: evaluatedAt },
        endsAt: { gt: evaluatedAt },
        ...(scope.outletId
          ? {
              OR: [
                { outletScope: PromotionCampaignOutletScope.ALL_OUTLETS },
                {
                  outletScope: PromotionCampaignOutletScope.SELECTED_OUTLETS,
                  outlets: { some: { outletId: scope.outletId } },
                },
              ],
            }
          : {}),
      },
      include: campaignInclude,
      orderBy: [{ priority: 'asc' }, { startsAt: 'asc' }],
    });
  }

  private policyCandidate(
    policy: DiscountPolicyRecord,
    dto: EvaluateDiscountEligibilityDto,
    evaluatedAt: Date,
  ): EligibilityCandidate {
    const reasons = this.commonPolicyReasons(policy, dto, evaluatedAt);
    const calculation = reasons.length === 0 ? this.policyCalculation(policy, dto) : null;
    return {
      source: 'DISCOUNT_POLICY',
      id: policy.id,
      code: policy.code,
      name: policy.name,
      eligible: reasons.length === 0,
      selected: false,
      reasons,
      priority: policy.requiresManagerApproval ? 200 : 100,
      calculation,
      snapshot: {
        id: policy.id,
        code: policy.code,
        name: policy.name,
        scope: policy.scope,
        valueType: policy.valueType,
        percentageBps: policy.percentageBps,
        amountMinor: policy.amountMinor,
        currencyCode: policy.currencyCode,
        maxDiscountMinor: policy.maxDiscountMinor,
        version: policy.version,
      },
    };
  }

  private couponCandidate(
    coupon: CouponRecord,
    dto: EvaluateDiscountEligibilityDto,
    evaluatedAt: Date,
  ): EligibilityCandidate {
    const reasons = this.commonCouponReasons(coupon, dto, evaluatedAt);
    const calculation = reasons.length === 0 ? this.couponCalculation(coupon, dto) : null;
    return {
      source: 'COUPON',
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      eligible: reasons.length === 0,
      selected: false,
      reasons,
      priority: 20,
      calculation,
      snapshot: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        couponType: coupon.couponType,
        valueType: coupon.valueType,
        percentageBps: coupon.percentageBps,
        amountMinor: coupon.amountMinor,
        currencyCode: coupon.currencyCode,
        maxDiscountMinor: coupon.maxDiscountMinor,
        targetMenuCategoryId: coupon.targetMenuCategoryId,
        targetMenuItemId: coupon.targetMenuItemId,
        freeItemMenuItemId: coupon.freeItemMenuItemId,
        version: coupon.version,
      },
    };
  }

  private missingCouponCandidates(
    dto: EvaluateDiscountEligibilityDto,
    coupons: CouponRecord[],
  ): EligibilityCandidate[] {
    const found = new Set(coupons.map((coupon) => coupon.code));
    return unique((dto.couponCodes ?? []).map((code) => normalizeCouponCode(code)))
      .filter((code) => code.length > 0 && !found.has(code))
      .map((code) => ({
        source: 'COUPON' as const,
        id: code,
        code,
        name: code,
        eligible: false,
        selected: false,
        reasons: ['NOT_FOUND'],
        priority: 20,
        calculation: null,
        snapshot: { code },
      }));
  }

  private ruleCandidate(
    campaign: CampaignRecord,
    rule: CampaignRuleRecord,
    dto: EvaluateDiscountEligibilityDto,
    evaluatedAt: Date,
  ): EligibilityCandidate {
    const reasons = this.commonRuleReasons(campaign, rule, dto, evaluatedAt);
    const calculation = reasons.length === 0 ? this.ruleCalculation(rule, dto) : null;
    return {
      source: 'CAMPAIGN_RULE',
      id: rule.id,
      parentId: campaign.id,
      code: campaign.code,
      name: rule.name,
      eligible: reasons.length === 0,
      selected: false,
      reasons,
      priority: campaign.priority + rule.priority,
      calculation,
      snapshot: {
        campaignId: campaign.id,
        campaignCode: campaign.code,
        campaignVersion: campaign.version,
        ruleId: rule.id,
        ruleType: rule.ruleType,
        valueType: rule.valueType,
        percentageBps: rule.percentageBps,
        amountMinor: rule.amountMinor,
        currencyCode: rule.currencyCode,
        maxDiscountMinor: rule.maxDiscountMinor,
        minimumSubtotalMinor: rule.minimumSubtotalMinor,
        targetMenuCategoryId: rule.targetMenuCategoryId,
        targetMenuItemId: rule.targetMenuItemId,
        freeItemMenuItemId: rule.freeItemMenuItemId,
      },
    };
  }

  private applyStacking(candidates: EligibilityCandidate[]): EligibilityCandidate[] {
    const eligible = candidates.filter((candidate) => candidate.eligible);
    if (eligible.length === 0) return candidates;
    const selected = [...eligible].sort((left, right) => {
      const amountDelta = amount(right) - amount(left);
      if (amountDelta !== 0) return amountDelta;
      const priorityDelta = left.priority - right.priority;
      if (priorityDelta !== 0) return priorityDelta;
      return sourceRank(left.source) - sourceRank(right.source);
    })[0];

    return candidates.map((candidate) => {
      if (!candidate.eligible) return candidate;
      if (candidate === selected) return { ...candidate, selected: true };
      return {
        ...candidate,
        selected: false,
        eligible: false,
        reasons: [...candidate.reasons, 'STACKING_CONFLICT'],
      };
    });
  }

  private commonPolicyReasons(
    policy: DiscountPolicyRecord,
    dto: EvaluateDiscountEligibilityDto,
    evaluatedAt: Date,
  ): string[] {
    const reasons: string[] = [];
    if (policy.status !== DiscountPolicyStatus.ACTIVE) reasons.push('INACTIVE');
    if (policy.startsAt && policy.startsAt.getTime() > evaluatedAt.getTime()) {
      reasons.push('NOT_STARTED');
    }
    if (policy.endsAt && policy.endsAt.getTime() <= evaluatedAt.getTime()) reasons.push('EXPIRED');
    if (policy.currencyCode && policy.currencyCode !== dto.currencyCode) {
      reasons.push('CURRENCY_MISMATCH');
    }
    if (policy.scope !== DiscountScope.BILL) reasons.push('TARGET_CONTEXT_REQUIRED');
    if (policy.requiresManagerApproval) reasons.push('MANAGER_APPROVAL_REQUIRED');
    if (!policy.percentageBps && !policy.amountMinor) reasons.push('MISSING_DISCOUNT_VALUE');
    return reasons;
  }

  private commonCouponReasons(
    coupon: CouponRecord,
    dto: EvaluateDiscountEligibilityDto,
    evaluatedAt: Date,
  ): string[] {
    const reasons: string[] = [];
    if (coupon.status !== CouponStatus.ACTIVE) reasons.push('INACTIVE');
    if (coupon.startsAt && coupon.startsAt.getTime() > evaluatedAt.getTime()) {
      reasons.push('NOT_STARTED');
    }
    if (coupon.endsAt && coupon.endsAt.getTime() <= evaluatedAt.getTime()) reasons.push('EXPIRED');
    if (coupon.currencyCode && coupon.currencyCode !== dto.currencyCode) {
      reasons.push('CURRENCY_MISMATCH');
    }
    if (coupon.totalUsageLimit !== null && coupon.currentUsageCount >= coupon.totalUsageLimit) {
      reasons.push('USAGE_LIMIT_REACHED');
    }
    if (coupon.perCustomerUsageLimit !== null && !dto.customerId) {
      reasons.push('CUSTOMER_REQUIRED');
    }
    if (!this.hasTargetSubtotal(couponTarget(coupon), dto))
      reasons.push(targetMissingReason(coupon));
    if (
      coupon.couponType !== CouponType.FREE_ITEM &&
      !coupon.percentageBps &&
      !coupon.amountMinor
    ) {
      reasons.push('MISSING_DISCOUNT_VALUE');
    }
    return reasons;
  }

  private commonRuleReasons(
    campaign: CampaignRecord,
    rule: CampaignRuleRecord,
    dto: EvaluateDiscountEligibilityDto,
    evaluatedAt: Date,
  ): string[] {
    const reasons: string[] = [];
    if (campaign.status !== PromotionCampaignStatus.ACTIVE) reasons.push('INACTIVE');
    if (campaign.startsAt.getTime() > evaluatedAt.getTime()) reasons.push('NOT_STARTED');
    if (campaign.endsAt.getTime() <= evaluatedAt.getTime()) reasons.push('EXPIRED');
    if (!rule.isActive) reasons.push('INACTIVE_RULE');
    if (rule.currencyCode && rule.currencyCode !== dto.currencyCode) {
      reasons.push('CURRENCY_MISMATCH');
    }
    if (rule.minimumSubtotalMinor !== null && dto.subtotalMinor < rule.minimumSubtotalMinor) {
      reasons.push('MINIMUM_SUBTOTAL_NOT_MET');
    }
    if (!this.hasTargetSubtotal(ruleTarget(rule), dto)) reasons.push(ruleTargetMissingReason(rule));
    if (rule.ruleType !== PromotionRuleType.FREE_ITEM && !rule.percentageBps && !rule.amountMinor) {
      reasons.push('MISSING_DISCOUNT_VALUE');
    }
    return reasons;
  }

  private policyCalculation(
    policy: DiscountPolicyRecord,
    dto: EvaluateDiscountEligibilityDto,
  ): EligibilityCalculation | null {
    return this.valueCalculation(
      dto.subtotalMinor,
      dto.currencyCode,
      policy.valueType,
      policy.percentageBps,
      policy.amountMinor,
      policy.maxDiscountMinor,
    );
  }

  private couponCalculation(
    coupon: CouponRecord,
    dto: EvaluateDiscountEligibilityDto,
  ): EligibilityCalculation | null {
    if (coupon.couponType === CouponType.FREE_ITEM) return null;
    return this.valueCalculation(
      this.targetSubtotal(couponTarget(coupon), dto),
      dto.currencyCode,
      coupon.valueType,
      coupon.percentageBps,
      coupon.amountMinor,
      coupon.maxDiscountMinor,
    );
  }

  private ruleCalculation(
    rule: CampaignRuleRecord,
    dto: EvaluateDiscountEligibilityDto,
  ): EligibilityCalculation | null {
    if (rule.ruleType === PromotionRuleType.FREE_ITEM) return null;
    return this.valueCalculation(
      this.targetSubtotal(ruleTarget(rule), dto),
      dto.currencyCode,
      rule.valueType,
      rule.percentageBps,
      rule.amountMinor,
      rule.maxDiscountMinor,
    );
  }

  private valueCalculation(
    baseAmountMinor: number,
    currencyCode: string,
    valueType: DiscountValueType | null,
    percentageBps: number | null,
    amountMinor: number | null,
    maxDiscountMinor: number | null,
  ): EligibilityCalculation | null {
    if (baseAmountMinor <= 0) return null;
    let discountAmountMinor: number | null = null;
    if (valueType === DiscountValueType.PERCENTAGE && percentageBps !== null) {
      discountAmountMinor = Math.floor((baseAmountMinor * percentageBps) / 10_000);
    }
    if (valueType === DiscountValueType.FIXED_AMOUNT && amountMinor !== null) {
      discountAmountMinor = amountMinor;
    }
    if (discountAmountMinor === null) return null;
    const cappedByBase = Math.min(discountAmountMinor, baseAmountMinor);
    const capped =
      maxDiscountMinor === null ? cappedByBase : Math.min(cappedByBase, maxDiscountMinor);
    return {
      baseAmountMinor,
      discountAmountMinor: capped,
      finalAmountMinor: baseAmountMinor - capped,
      currencyCode,
    };
  }

  private hasTargetSubtotal(target: DiscountTarget, dto: EvaluateDiscountEligibilityDto): boolean {
    if (target.kind === 'BILL' || target.kind === 'FREE_ITEM') return true;
    return this.targetSubtotal(target, dto) > 0;
  }

  private targetSubtotal(target: DiscountTarget, dto: EvaluateDiscountEligibilityDto): number {
    if (target.kind === 'BILL') return dto.subtotalMinor;
    if (target.kind === 'ITEM') {
      return (dto.items ?? [])
        .filter((item) => item.menuItemId === target.menuItemId)
        .reduce((total, item) => total + lineTotal(item), 0);
    }
    if (target.kind === 'CATEGORY') {
      return (dto.items ?? [])
        .filter((item) => item.categoryId === target.categoryId)
        .reduce((total, item) => total + lineTotal(item), 0);
    }
    return 0;
  }
}

type DiscountTarget =
  | { kind: 'BILL' }
  | { kind: 'ITEM'; menuItemId: string | null }
  | { kind: 'CATEGORY'; categoryId: string | null }
  | { kind: 'FREE_ITEM' };

function couponTarget(coupon: CouponRecord): DiscountTarget {
  if (coupon.couponType === CouponType.ITEM) {
    return { kind: 'ITEM', menuItemId: coupon.targetMenuItemId };
  }
  if (coupon.couponType === CouponType.CATEGORY) {
    return { kind: 'CATEGORY', categoryId: coupon.targetMenuCategoryId };
  }
  if (coupon.couponType === CouponType.FREE_ITEM) return { kind: 'FREE_ITEM' };
  return { kind: 'BILL' };
}

function ruleTarget(rule: CampaignRuleRecord): DiscountTarget {
  if (rule.ruleType === PromotionRuleType.ITEM) {
    return { kind: 'ITEM', menuItemId: rule.targetMenuItemId };
  }
  if (rule.ruleType === PromotionRuleType.CATEGORY) {
    return { kind: 'CATEGORY', categoryId: rule.targetMenuCategoryId };
  }
  if (rule.ruleType === PromotionRuleType.FREE_ITEM) return { kind: 'FREE_ITEM' };
  return { kind: 'BILL' };
}

function targetMissingReason(coupon: CouponRecord): string {
  if (coupon.couponType === CouponType.ITEM) return 'ITEM_NOT_PRESENT';
  if (coupon.couponType === CouponType.CATEGORY) return 'CATEGORY_NOT_PRESENT';
  return 'TARGET_NOT_PRESENT';
}

function ruleTargetMissingReason(rule: CampaignRuleRecord): string {
  if (rule.ruleType === PromotionRuleType.ITEM) return 'ITEM_NOT_PRESENT';
  if (rule.ruleType === PromotionRuleType.CATEGORY) return 'CATEGORY_NOT_PRESENT';
  return 'TARGET_NOT_PRESENT';
}

function lineTotal(item: DiscountEligibilityItemDto): number {
  return item.lineTotalMinor ?? item.quantity * item.unitPriceMinor;
}

function amount(candidate: EligibilityCandidate): number {
  return candidate.calculation?.discountAmountMinor ?? 0;
}

function sourceRank(source: CandidateSource): number {
  if (source === 'COUPON') return 0;
  if (source === 'CAMPAIGN_RULE') return 1;
  return 2;
}

function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
