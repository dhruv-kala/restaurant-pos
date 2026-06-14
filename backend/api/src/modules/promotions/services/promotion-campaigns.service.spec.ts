import {
  PromotionCampaignOutletScope,
  PromotionCampaignStatus,
  PromotionRuleType,
  DiscountValueType,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { PromotionCampaignsService } from './promotion-campaigns.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const now = new Date();

const actor: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'manager@example.test',
  name: 'Manager',
  tenantId,
  outletId,
  roles: ['MANAGER'],
  permissions: ['promotions.campaign_manage'],
};

function campaign(overrides: object = {}) {
  return {
    id: '01975c30-0000-7000-8000-000000000300',
    tenantId,
    code: 'happy-hour',
    name: 'Happy Hour',
    description: null,
    status: PromotionCampaignStatus.ACTIVE,
    outletScope: PromotionCampaignOutletScope.SELECTED_OUTLETS,
    startsAt: new Date(now.getTime() - 60_000),
    endsAt: new Date(now.getTime() + 60_000),
    priority: 10,
    metadata: null,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    outlets: [{ tenantId, campaignId: 'campaign-1', outletId, assignedAt: now }],
    rules: [
      {
        id: '01975c30-0000-7000-8000-000000000301',
        tenantId,
        campaignId: '01975c30-0000-7000-8000-000000000300',
        ruleType: PromotionRuleType.PERCENTAGE,
        name: '10 percent off',
        description: null,
        discountPolicyId: null,
        valueType: DiscountValueType.PERCENTAGE,
        percentageBps: 1000,
        amountMinor: null,
        currencyCode: null,
        maxDiscountMinor: 125,
        minimumSubtotalMinor: 500,
        targetMenuCategoryId: null,
        targetMenuItemId: null,
        freeItemMenuItemId: null,
        priority: 1,
        isActive: true,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    ...overrides,
  };
}

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

describe('PromotionCampaignsService', () => {
  it('evaluates active in-window campaign rules without creating redemptions', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      promotionCampaign: {
        findMany: jest.fn().mockResolvedValue([campaign()]),
      },
    };
    const service = new PromotionCampaignsService(transactionalPrisma(tx), {} as AuditService);

    const result = await service.evaluate(
      { outletId, subtotalMinor: 2000, currencyCode: 'INR' },
      actor,
    );

    expect(result.createsRedemption).toBe(false);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].rules[0].calculation).toEqual(
      expect.objectContaining({
        baseAmountMinor: 2000,
        discountAmountMinor: 125,
        finalAmountMinor: 1875,
      }),
    );
  });

  it('does not return rules below their minimum subtotal', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      promotionCampaign: {
        findMany: jest.fn().mockResolvedValue([campaign()]),
      },
    };
    const service = new PromotionCampaignsService(transactionalPrisma(tx), {} as AuditService);

    const result = await service.evaluate({ outletId, subtotalMinor: 100 }, actor);

    expect(result.data).toHaveLength(0);
  });
});
