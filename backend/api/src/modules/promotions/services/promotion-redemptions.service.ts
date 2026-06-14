import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  Prisma,
  PromotionRedemptionSource,
  type PromotionRedemption,
} from '@prisma/client';
import { createHash } from 'node:crypto';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  PromotionRedemptionQueryDto,
  RedeemPromotionDto,
} from '../dto/promotion-redemption.dto';
import type { EvaluateDiscountEligibilityDto } from '../dto/discount-eligibility.dto';
import type { EligibilityCandidate } from './discount-eligibility.service';
import { DiscountEligibilityService } from './discount-eligibility.service';
import {
  requireRedemptionCreate,
  requireRedemptionRead,
  resolvePromotionsScope,
  type PromotionsScope,
} from './promotions-access.util';

type BillContext = {
  id: string;
  tenantId: string;
  outletId: string;
  orderId: string;
  currencyCode: string;
  subtotal: number;
};

@Injectable()
export class PromotionRedemptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: DiscountEligibilityService,
    private readonly audit: AuditService,
  ) {}

  async redeem(dto: RedeemPromotionDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireRedemptionCreate(actor);
    this.assertSourceSelection(dto);
    const initialScope = resolvePromotionsScope(actor, dto.tenantId, dto.outletId);
    const fingerprint = fingerprintRequest({
      tenantId: initialScope.tenantId,
      outletId: dto.outletId ?? null,
      billId: dto.billId,
      orderId: dto.orderId ?? null,
      customerId: dto.customerId ?? null,
      source: dto.source,
      couponCode: dto.couponCode ? normalizeCouponCode(dto.couponCode) : null,
      campaignId: dto.campaignId ?? null,
      promotionRuleId: dto.promotionRuleId ?? null,
      discountPolicyId: dto.discountPolicyId ?? null,
      subtotalMinor: dto.subtotalMinor ?? null,
      currencyCode: dto.currencyCode ?? null,
      items: dto.items ?? [],
      metadata: dto.metadata ?? null,
    });

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, initialScope.tenantId);
      const existing = await tx.promotionRedemption.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: initialScope.tenantId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) {
          throw new ConflictException('Idempotency key was already used with a different request');
        }
        return this.redemptionResponse(existing);
      }

      const bill = await this.findBillContext(tx, initialScope, dto.billId);
      if (dto.orderId && dto.orderId !== bill.orderId) {
        throw new BadRequestException('orderId does not match the bill order');
      }
      const order = await tx.order.findFirst({
        where: { tenantId: initialScope.tenantId, id: bill.orderId, outletId: bill.outletId },
        select: { id: true, customerId: true },
      });
      const customerId = dto.customerId ?? order?.customerId ?? null;
      if (dto.customerId && order?.customerId && dto.customerId !== order.customerId) {
        throw new BadRequestException('customerId does not match the bill order customer');
      }
      if (customerId) {
        await this.assertCustomer(tx, initialScope.tenantId, customerId);
      }

      const scope: PromotionsScope = {
        tenantId: initialScope.tenantId,
        outletId: initialScope.outletId ?? bill.outletId,
        managerOutletOnly: initialScope.managerOutletOnly,
      };
      const eligibilityDto = this.eligibilityDto(dto, bill, customerId, scope.outletId);
      const evaluatedAt = new Date();
      const eligibility = await this.eligibility.evaluateInTransaction(
        tx,
        eligibilityDto,
        actor,
        scope,
        evaluatedAt,
        { includeDefaultPolicies: false, includeDefaultCampaigns: false },
      );
      const candidate = this.selectedCandidate(dto, eligibility.candidates);
      if (!candidate || !candidate.selected || !candidate.eligible) {
        throw new ConflictException({
          message: 'Promotion is not eligible for redemption',
          reasons: candidate?.reasons ?? ['NOT_ELIGIBLE'],
        });
      }

      if (dto.source === PromotionRedemptionSource.COUPON) {
        await this.enforceCouponUsage(tx, initialScope.tenantId, candidate.id, customerId);
      }

      const calculation = candidate.calculation ?? {
        baseAmountMinor: eligibilityDto.subtotalMinor,
        discountAmountMinor: 0,
        finalAmountMinor: eligibilityDto.subtotalMinor,
        currencyCode: eligibilityDto.currencyCode,
      };
      const redemption = await tx.promotionRedemption.create({
        data: {
          tenantId: initialScope.tenantId,
          outletId: scope.outletId ?? null,
          billId: bill.id,
          orderId: bill.orderId,
          customerId,
          source: dto.source,
          couponId: dto.source === PromotionRedemptionSource.COUPON ? candidate.id : null,
          campaignId:
            dto.source === PromotionRedemptionSource.CAMPAIGN_RULE
              ? (candidate.parentId ?? dto.campaignId ?? null)
              : null,
          promotionRuleId:
            dto.source === PromotionRedemptionSource.CAMPAIGN_RULE ? candidate.id : null,
          discountPolicyId:
            dto.source === PromotionRedemptionSource.DISCOUNT_POLICY ? candidate.id : null,
          sourceCodeSnapshot: candidate.code ?? null,
          sourceNameSnapshot: candidate.name,
          currencyCode: calculation.currencyCode,
          baseAmountMinor: calculation.baseAmountMinor,
          discountAmountMinor: calculation.discountAmountMinor,
          finalAmountMinor: calculation.finalAmountMinor,
          calculationSnapshot: calculation as unknown as Prisma.InputJsonValue,
          eligibilitySnapshot: {
            candidate,
            evaluatedAt: eligibility.context.evaluatedAt,
            stacking: eligibility.stacking,
          } as unknown as Prisma.InputJsonValue,
          idempotencyKey: dto.idempotencyKey,
          requestFingerprint: fingerprint,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          redeemedByUserId: actor.id,
        },
      });
      if (dto.source === PromotionRedemptionSource.COUPON) {
        await tx.coupon.update({
          where: { tenantId_id: { tenantId: initialScope.tenantId, id: candidate.id } },
          data: { currentUsageCount: { increment: 1 } },
        });
      }
      await this.audit.append(tx, {
        tenantId: initialScope.tenantId,
        outletId: redemption.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'promotions.redemption.created',
        targetType: 'PromotionRedemption',
        targetId: redemption.id,
        result: AuditResult.SUCCESS,
        metadata: {
          billId: redemption.billId,
          orderId: redemption.orderId,
          customerId: redemption.customerId,
          source: redemption.source,
          couponId: redemption.couponId,
          campaignId: redemption.campaignId,
          promotionRuleId: redemption.promotionRuleId,
          discountPolicyId: redemption.discountPolicyId,
          discountAmountMinor: redemption.discountAmountMinor,
        },
        idempotencyKey: dto.idempotencyKey,
        ...request,
      });
      return this.redemptionResponse(redemption);
    });
  }

  async list(query: PromotionRedemptionQueryDto, actor: AuthenticatedUser) {
    requireRedemptionRead(actor);
    const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.redemptionWhere(query, scope);
      const [records, total] = await Promise.all([
        tx.promotionRedemption.findMany({
          where,
          orderBy: [{ redeemedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.promotionRedemption.count({ where }),
      ]);
      return {
        data: records.map((record) => this.redemptionResponse(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: PromotionRedemptionQueryDto, actor: AuthenticatedUser) {
    requireRedemptionRead(actor);
    const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const record = await tx.promotionRedemption.findFirst({
        where: { ...this.redemptionWhere(query, scope), id },
      });
      if (!record) throw new NotFoundException('Promotion redemption not found');
      return this.redemptionResponse(record);
    });
  }

  private async findBillContext(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    billId: string,
  ): Promise<BillContext> {
    const bill = await tx.bill.findFirst({
      where: {
        tenantId: scope.tenantId,
        id: billId,
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
      },
      select: {
        id: true,
        tenantId: true,
        outletId: true,
        orderId: true,
        currencyCode: true,
        subtotal: true,
      },
    });
    if (!bill) throw new BadRequestException('Bill is not valid for this tenant/outlet');
    return bill;
  }

  private async assertCustomer(
    tx: Prisma.TransactionClient,
    tenantId: string,
    customerId: string,
  ): Promise<void> {
    const customer = await tx.customer.findFirst({
      where: { tenantId, id: customerId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new BadRequestException('Customer is not active for this tenant');
  }

  private async enforceCouponUsage(
    tx: Prisma.TransactionClient,
    tenantId: string,
    couponId: string,
    customerId: string | null,
  ): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:coupon:${couponId}`}))`;
    const coupon = await tx.coupon.findUnique({
      where: { tenantId_id: { tenantId, id: couponId } },
      select: {
        id: true,
        totalUsageLimit: true,
        currentUsageCount: true,
        perCustomerUsageLimit: true,
      },
    });
    if (!coupon) throw new ConflictException('Coupon is no longer available');
    if (coupon.totalUsageLimit !== null && coupon.currentUsageCount >= coupon.totalUsageLimit) {
      throw new ConflictException({
        message: 'Promotion is not eligible for redemption',
        reasons: ['USAGE_LIMIT_REACHED'],
      });
    }
    if (coupon.perCustomerUsageLimit !== null) {
      if (!customerId) {
        throw new ConflictException({
          message: 'Promotion is not eligible for redemption',
          reasons: ['CUSTOMER_REQUIRED'],
        });
      }
      const usedByCustomer = await tx.promotionRedemption.count({
        where: { tenantId, couponId, customerId },
      });
      if (usedByCustomer >= coupon.perCustomerUsageLimit) {
        throw new ConflictException({
          message: 'Promotion is not eligible for redemption',
          reasons: ['CUSTOMER_USAGE_LIMIT_REACHED'],
        });
      }
    }
  }

  private eligibilityDto(
    dto: RedeemPromotionDto,
    bill: BillContext,
    customerId: string | null,
    outletId?: string,
  ): EvaluateDiscountEligibilityDto {
    return {
      tenantId: bill.tenantId,
      outletId,
      customerId: customerId ?? undefined,
      orderId: dto.orderId ?? bill.orderId,
      billId: bill.id,
      subtotalMinor: dto.subtotalMinor ?? bill.subtotal,
      currencyCode: dto.currencyCode ?? bill.currencyCode,
      couponCodes:
        dto.source === PromotionRedemptionSource.COUPON && dto.couponCode
          ? [dto.couponCode]
          : undefined,
      discountPolicyIds:
        dto.source === PromotionRedemptionSource.DISCOUNT_POLICY && dto.discountPolicyId
          ? [dto.discountPolicyId]
          : undefined,
      campaignIds:
        dto.source === PromotionRedemptionSource.CAMPAIGN_RULE && dto.campaignId
          ? [dto.campaignId]
          : undefined,
      items: dto.items,
    };
  }

  private selectedCandidate(
    dto: RedeemPromotionDto,
    candidates: EligibilityCandidate[],
  ): EligibilityCandidate | undefined {
    if (dto.source === PromotionRedemptionSource.COUPON && dto.couponCode) {
      const code = normalizeCouponCode(dto.couponCode);
      return candidates.find(
        (candidate) => candidate.source === 'COUPON' && candidate.code === code,
      );
    }
    if (dto.source === PromotionRedemptionSource.DISCOUNT_POLICY && dto.discountPolicyId) {
      return candidates.find(
        (candidate) =>
          candidate.source === 'DISCOUNT_POLICY' && candidate.id === dto.discountPolicyId,
      );
    }
    if (dto.source === PromotionRedemptionSource.CAMPAIGN_RULE && dto.promotionRuleId) {
      return candidates.find(
        (candidate) =>
          candidate.source === 'CAMPAIGN_RULE' &&
          candidate.id === dto.promotionRuleId &&
          (!dto.campaignId || candidate.parentId === dto.campaignId),
      );
    }
    return undefined;
  }

  private assertSourceSelection(dto: RedeemPromotionDto): void {
    const selected = [
      dto.source === PromotionRedemptionSource.COUPON && dto.couponCode,
      dto.source === PromotionRedemptionSource.CAMPAIGN_RULE &&
        dto.campaignId &&
        dto.promotionRuleId,
      dto.source === PromotionRedemptionSource.DISCOUNT_POLICY && dto.discountPolicyId,
    ].filter(Boolean);
    if (selected.length !== 1) {
      throw new BadRequestException('Exactly one redemption source must be selected');
    }
  }

  private redemptionWhere(
    query: PromotionRedemptionQueryDto,
    scope: PromotionsScope,
  ): Prisma.PromotionRedemptionWhereInput {
    return {
      tenantId: scope.tenantId,
      ...(scope.outletId ? { outletId: scope.outletId } : {}),
      ...(query.billId ? { billId: query.billId } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.couponId ? { couponId: query.couponId } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.source ? { source: query.source } : {}),
    };
  }

  private redemptionResponse(record: PromotionRedemption) {
    return {
      id: record.id,
      tenantId: record.tenantId,
      outletId: record.outletId,
      billId: record.billId,
      orderId: record.orderId,
      customerId: record.customerId,
      source: record.source,
      couponId: record.couponId,
      campaignId: record.campaignId,
      promotionRuleId: record.promotionRuleId,
      discountPolicyId: record.discountPolicyId,
      sourceCodeSnapshot: record.sourceCodeSnapshot,
      sourceNameSnapshot: record.sourceNameSnapshot,
      currencyCode: record.currencyCode,
      baseAmountMinor: record.baseAmountMinor,
      discountAmountMinor: record.discountAmountMinor,
      finalAmountMinor: record.finalAmountMinor,
      calculationSnapshot: record.calculationSnapshot,
      eligibilitySnapshot: record.eligibilitySnapshot,
      metadata: record.metadata,
      redeemedByUserId: record.redeemedByUserId,
      redeemedAt: record.redeemedAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
    };
  }
}

function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

function fingerprintRequest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
