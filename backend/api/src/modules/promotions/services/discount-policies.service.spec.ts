import { DiscountScope, DiscountValueType } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { DiscountPoliciesService } from './discount-policies.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';

const manager: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'manager@example.test',
  name: 'Manager',
  tenantId,
  outletId: '01975c30-0000-7000-8000-000000000200',
  roles: ['MANAGER'],
  permissions: ['promotions.read', 'promotions.apply_discount'],
};

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

describe('DiscountPoliciesService', () => {
  it('calculates percentage discounts deterministically with max cap', async () => {
    const tx = { $queryRaw: jest.fn() };
    const service = new DiscountPoliciesService(transactionalPrisma(tx), {} as AuditService);

    const result = await service.calculate(
      {
        scope: DiscountScope.BILL,
        valueType: DiscountValueType.PERCENTAGE,
        percentageBps: 1250,
        maxDiscountMinor: 100,
        baseAmountMinor: 999,
        currencyCode: 'INR',
      },
      manager,
    );

    expect(result).toEqual(
      expect.objectContaining({
        discountAmountMinor: 100,
        finalAmountMinor: 899,
        percentageBps: 1250,
      }),
    );
  });

  it('does not let a cashier store arbitrary manual overrides', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      discountApplication: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const cashier: AuthenticatedUser = {
      ...manager,
      roles: ['CASHIER'],
      permissions: ['promotions.apply_discount'],
    };
    const service = new DiscountPoliciesService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.applyManual(
        {
          scope: DiscountScope.BILL,
          valueType: DiscountValueType.FIXED_AMOUNT,
          amountMinor: 50,
          baseAmountMinor: 500,
          currencyCode: 'INR',
          idempotencyKey: 'manual-discount-1',
        },
        cashier,
        {},
      ),
    ).rejects.toThrow('Discount override permission is required');
  });
});
