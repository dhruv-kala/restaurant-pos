import { ConflictException } from '@nestjs/common';
import { PromotionRedemptionSource } from '@prisma/client';
import { createHash } from 'node:crypto';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import type { DiscountEligibilityService } from './discount-eligibility.service';
import { PromotionRedemptionsService } from './promotion-redemptions.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const billId = '01975c30-0000-7000-8000-000000000300';
const orderId = '01975c30-0000-7000-8000-000000000400';
const couponId = '01975c30-0000-7000-8000-000000000500';
const customerId = '01975c30-0000-7000-8000-000000000600';
const actorId = '01975c30-0000-7000-8000-000000000001';
const now = new Date('2026-06-14T10:00:00.000Z');

const actor: AuthenticatedUser = {
  id: actorId,
  email: 'cashier@example.test',
  name: 'Cashier',
  tenantId,
  outletId,
  roles: ['CASHIER'],
  permissions: ['promotions.redemption_create'],
};

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

function redemption(overrides: object = {}) {
  return {
    id: '01975c30-0000-7000-8000-000000000700',
    tenantId,
    outletId,
    billId,
    orderId,
    customerId,
    source: PromotionRedemptionSource.COUPON,
    couponId,
    campaignId: null,
    promotionRuleId: null,
    discountPolicyId: null,
    sourceCodeSnapshot: 'SAVE10',
    sourceNameSnapshot: 'Save 10',
    currencyCode: 'INR',
    baseAmountMinor: 1000,
    discountAmountMinor: 100,
    finalAmountMinor: 900,
    calculationSnapshot: {},
    eligibilitySnapshot: {},
    idempotencyKey: 'redeem-1',
    requestFingerprint: 'fingerprint',
    metadata: null,
    redeemedByUserId: actorId,
    redeemedAt: now,
    createdAt: now,
    ...overrides,
  };
}

function tx(overrides: Record<string, unknown> = {}) {
  return {
    $queryRaw: jest.fn(),
    promotionRedemption: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(redemption()),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    bill: {
      findFirst: jest.fn().mockResolvedValue({
        id: billId,
        tenantId,
        outletId,
        orderId,
        currencyCode: 'INR',
        subtotal: 1000,
      }),
    },
    order: {
      findFirst: jest.fn().mockResolvedValue({ id: orderId, customerId }),
    },
    customer: {
      findFirst: jest.fn().mockResolvedValue({ id: customerId }),
    },
    coupon: {
      findUnique: jest.fn().mockResolvedValue({
        id: couponId,
        totalUsageLimit: 10,
        currentUsageCount: 0,
        perCustomerUsageLimit: 2,
      }),
      update: jest.fn().mockResolvedValue({ id: couponId }),
    },
    ...overrides,
  };
}

function eligibility(): DiscountEligibilityService {
  return {
    evaluateInTransaction: jest.fn().mockResolvedValue({
      eligible: true,
      selected: [],
      rejected: [],
      candidates: [
        {
          source: 'COUPON',
          id: couponId,
          code: 'SAVE10',
          name: 'Save 10',
          eligible: true,
          selected: true,
          reasons: [],
          priority: 20,
          calculation: {
            baseAmountMinor: 1000,
            discountAmountMinor: 100,
            finalAmountMinor: 900,
            currencyCode: 'INR',
          },
          snapshot: { id: couponId },
        },
      ],
      stacking: {
        mode: 'BEST_SINGLE_DISCOUNT',
        maxApplications: 1,
        rejectedReason: 'STACKING_CONFLICT',
      },
      context: {
        tenantId,
        outletId,
        customerId,
        orderId,
        billId,
        evaluatedAt: now.toISOString(),
        subtotalMinor: 1000,
        currencyCode: 'INR',
      },
      createsRedemption: false,
    }),
  } as unknown as DiscountEligibilityService;
}

describe('PromotionRedemptionsService', () => {
  it('creates a coupon redemption and increments coupon usage', async () => {
    const store = tx();
    const append = jest.fn();
    const audit = { append } as unknown as AuditService;
    const service = new PromotionRedemptionsService(
      transactionalPrisma(store),
      eligibility(),
      audit,
    );

    const result = await service.redeem(
      {
        outletId,
        billId,
        source: PromotionRedemptionSource.COUPON,
        couponCode: 'save10',
        idempotencyKey: 'redeem-1',
      },
      actor,
      {},
    );

    expect(result).toEqual(expect.objectContaining({ couponId, discountAmountMinor: 100 }));
    expect(store.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_id: { tenantId, id: couponId } },
        data: { currentUsageCount: { increment: 1 } },
      }),
    );
    expect(append).toHaveBeenCalledWith(
      store,
      expect.objectContaining({ action: 'promotions.redemption.created' }),
    );
  });

  it('returns an existing redemption for an idempotent retry', async () => {
    const existing = redemption({
      requestFingerprint: testFingerprint({
        tenantId,
        outletId,
        billId,
        orderId: null,
        customerId: null,
        source: PromotionRedemptionSource.COUPON,
        couponCode: 'SAVE10',
        campaignId: null,
        promotionRuleId: null,
        discountPolicyId: null,
        subtotalMinor: null,
        currencyCode: null,
        items: [],
        metadata: null,
      }),
    });
    const store = tx({
      promotionRedemption: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    });
    const service = new PromotionRedemptionsService(transactionalPrisma(store), eligibility(), {
      append: jest.fn(),
    } as unknown as AuditService);

    const result = await service.redeem(
      {
        outletId,
        billId,
        source: PromotionRedemptionSource.COUPON,
        couponCode: 'save10',
        idempotencyKey: 'redeem-1',
      },
      actor,
      {},
    );

    expect(result).toEqual(expect.objectContaining({ id: existing.id }));
    expect(store.promotionRedemption.create).not.toHaveBeenCalled();
  });

  it('rejects a coupon when the per-customer usage limit is reached', async () => {
    const store = tx({
      promotionRedemption: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
      },
    });
    const service = new PromotionRedemptionsService(transactionalPrisma(store), eligibility(), {
      append: jest.fn(),
    } as unknown as AuditService);

    await expect(
      service.redeem(
        {
          outletId,
          billId,
          source: PromotionRedemptionSource.COUPON,
          couponCode: 'save10',
          idempotencyKey: 'redeem-1',
        },
        actor,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });
});

function testFingerprint(value: unknown): string {
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
