import {
  CouponStatus,
  CouponType,
  DiscountPolicyStatus,
  DiscountScope,
  DiscountValueType,
  PromotionCampaignStatus,
  PromotionRuleType,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { DiscountEligibilityService } from './discount-eligibility.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const now = new Date('2026-06-14T10:00:00.000Z');

const actor: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'cashier@example.test',
  name: 'Cashier',
  tenantId,
  outletId,
  roles: ['CASHIER'],
  permissions: ['promotions.eligibility_evaluate'],
};

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

function tx(overrides: Record<string, unknown> = {}) {
  return {
    $queryRaw: jest.fn(),
    outlet: { findFirst: jest.fn().mockResolvedValue({ id: outletId }) },
    customer: { findFirst: jest.fn() },
    order: { findFirst: jest.fn() },
    bill: { findFirst: jest.fn() },
    discountPolicy: { findMany: jest.fn().mockResolvedValue([]) },
    coupon: { findMany: jest.fn().mockResolvedValue([]) },
    promotionCampaign: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

function coupon(overrides: object = {}) {
  return {
    id: '01975c30-0000-7000-8000-000000000300',
    tenantId,
    outletId: null,
    code: 'SAVE10',
    name: 'Save 10',
    description: null,
    couponType: CouponType.PERCENTAGE,
    status: CouponStatus.ACTIVE,
    discountPolicyId: null,
    valueType: DiscountValueType.PERCENTAGE,
    percentageBps: 1000,
    amountMinor: null,
    currencyCode: null,
    maxDiscountMinor: null,
    targetMenuCategoryId: null,
    targetMenuItemId: null,
    freeItemMenuItemId: null,
    startsAt: new Date(now.getTime() - 60_000),
    endsAt: new Date(now.getTime() + 60_000),
    totalUsageLimit: null,
    perCustomerUsageLimit: null,
    currentUsageCount: 0,
    metadata: null,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function policy(overrides: object = {}) {
  return {
    id: '01975c30-0000-7000-8000-000000000400',
    tenantId,
    outletId: null,
    code: 'FIXED50',
    name: 'Fixed 50',
    description: null,
    scope: DiscountScope.BILL,
    valueType: DiscountValueType.FIXED_AMOUNT,
    percentageBps: null,
    amountMinor: 50,
    currencyCode: 'INR',
    maxDiscountMinor: null,
    startsAt: null,
    endsAt: null,
    requiresManagerApproval: false,
    status: DiscountPolicyStatus.ACTIVE,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('DiscountEligibilityService', () => {
  it('returns explicit reasons for invalid requested coupons', async () => {
    const store = tx({
      coupon: {
        findMany: jest.fn().mockResolvedValue([
          coupon({
            status: CouponStatus.INACTIVE,
            endsAt: new Date(now.getTime() - 60_000),
          }),
        ]),
      },
    });
    const service = new DiscountEligibilityService(transactionalPrisma(store));

    const result = await service.evaluate(
      {
        outletId,
        evaluatedAt: now.toISOString(),
        subtotalMinor: 1000,
        currencyCode: 'INR',
        couponCodes: ['SAVE10', 'MISSING'],
      },
      actor,
    );

    expect(result.eligible).toBe(false);
    const inactive = result.candidates.find((candidate) => candidate.code === 'SAVE10');
    const missing = result.candidates.find((candidate) => candidate.code === 'MISSING');
    expect(inactive?.reasons).toContain('INACTIVE');
    expect(inactive?.reasons).toContain('EXPIRED');
    expect(missing?.reasons).toEqual(['NOT_FOUND']);
  });

  it('selects the best eligible discount and rejects the rest as stacking conflicts', async () => {
    const store = tx({
      discountPolicy: {
        findMany: jest.fn().mockResolvedValue([policy()]),
      },
      coupon: {
        findMany: jest.fn().mockResolvedValue([coupon({ percentageBps: 2000 })]),
      },
    });
    const service = new DiscountEligibilityService(transactionalPrisma(store));

    const result = await service.evaluate(
      {
        outletId,
        evaluatedAt: now.toISOString(),
        subtotalMinor: 1000,
        currencyCode: 'INR',
        couponCodes: ['SAVE10'],
      },
      actor,
    );

    expect(result.selected).toHaveLength(1);
    expect(result.selected[0]?.source).toBe('COUPON');
    expect(result.selected[0]?.calculation?.discountAmountMinor).toBe(200);
    const rejectedPolicy = result.rejected.find(
      (candidate) => candidate.source === 'DISCOUNT_POLICY',
    );
    expect(rejectedPolicy?.reasons).toContain('STACKING_CONFLICT');
  });

  it('evaluates item-scoped campaign rules against item context', async () => {
    const itemId = '01975c30-0000-7000-8000-000000000501';
    const store = tx({
      promotionCampaign: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '01975c30-0000-7000-8000-000000000500',
            tenantId,
            code: 'item-campaign',
            name: 'Item campaign',
            status: PromotionCampaignStatus.ACTIVE,
            startsAt: new Date(now.getTime() - 60_000),
            endsAt: new Date(now.getTime() + 60_000),
            priority: 10,
            version: 1,
            outlets: [],
            rules: [
              {
                id: '01975c30-0000-7000-8000-000000000502',
                campaignId: '01975c30-0000-7000-8000-000000000500',
                ruleType: PromotionRuleType.ITEM,
                name: 'Item discount',
                isActive: true,
                valueType: DiscountValueType.PERCENTAGE,
                percentageBps: 5000,
                amountMinor: null,
                currencyCode: null,
                maxDiscountMinor: null,
                minimumSubtotalMinor: null,
                targetMenuItemId: itemId,
                targetMenuCategoryId: null,
                freeItemMenuItemId: null,
                priority: 1,
              },
            ],
          },
        ]),
      },
    });
    const service = new DiscountEligibilityService(transactionalPrisma(store));

    const result = await service.evaluate(
      {
        outletId,
        evaluatedAt: now.toISOString(),
        subtotalMinor: 1500,
        currencyCode: 'INR',
        items: [{ menuItemId: itemId, quantity: 2, unitPriceMinor: 300 }],
      },
      actor,
    );

    expect(result.selected[0]?.source).toBe('CAMPAIGN_RULE');
    expect(result.selected[0]?.calculation?.baseAmountMinor).toBe(600);
    expect(result.selected[0]?.calculation?.discountAmountMinor).toBe(300);
  });
});
