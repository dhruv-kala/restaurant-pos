import { ConflictException } from '@nestjs/common';
import { CouponStatus, CouponType, DiscountValueType } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { CouponsService } from './coupons.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const now = new Date();

const cashier: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'cashier@example.test',
  name: 'Cashier',
  tenantId,
  outletId,
  roles: ['CASHIER'],
  permissions: ['promotions.coupon_validate'],
};

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
    maxDiscountMinor: 150,
    targetMenuCategoryId: null,
    targetMenuItemId: null,
    freeItemMenuItemId: null,
    startsAt: null,
    endsAt: null,
    totalUsageLimit: 5,
    perCustomerUsageLimit: null,
    currentUsageCount: 0,
    metadata: null,
    createdByUserId: cashier.id,
    updatedByUserId: cashier.id,
    version: 1,
    createdAt: now,
    updatedAt: now,
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

describe('CouponsService', () => {
  it('validates an active percentage coupon without creating redemption records', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      coupon: {
        findFirst: jest.fn().mockResolvedValue(coupon()),
      },
      customer: {
        findFirst: jest.fn(),
      },
    };
    const appendAudit = jest.fn();
    const audit = { append: appendAudit } as unknown as AuditService;
    const service = new CouponsService(transactionalPrisma(tx), audit);

    const result = await service.validate(
      {
        code: 'save10',
        baseAmountMinor: 2000,
        currencyCode: 'INR',
      },
      cashier,
      {},
    );

    expect(result.valid).toBe(true);
    expect(result.calculation).toEqual(
      expect.objectContaining({
        baseAmountMinor: 2000,
        discountAmountMinor: 150,
        finalAmountMinor: 1850,
      }),
    );
    expect(result.createsRedemption).toBe(false);
    expect(appendAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'promotions.coupon.validated' }),
    );
  });

  it('rejects coupons after the total usage limit is reached', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      coupon: {
        findFirst: jest.fn().mockResolvedValue(coupon({ currentUsageCount: 5 })),
      },
      customer: {
        findFirst: jest.fn(),
      },
    };
    const service = new CouponsService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.validate({ code: 'SAVE10' }, cashier, {})).rejects.toThrow(
      ConflictException,
    );
  });
});
