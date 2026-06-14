import {
  FiscalPolicyStatus,
  OutletStatus,
  TaxGroupStatus,
  TaxMappingTarget,
  TaxMode,
  TaxRateStatus,
  TaxRuleStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  allocateByWeights,
  proportionalRound,
  TaxCalculationService,
} from './tax-calculation.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const profileId = '01975c30-0000-7000-8000-000000000300';
const fiscalPolicyId = '01975c30-0000-7000-8000-000000000301';
const menuItemId = '01975c30-0000-7000-8000-000000000400';
const categoryId = '01975c30-0000-7000-8000-000000000500';
const ruleId = '01975c30-0000-7000-8000-000000000600';
const groupId = '01975c30-0000-7000-8000-000000000700';
const calculatedAt = new Date('2026-06-14T10:00:00.000Z');

function txForMode(taxMode: TaxMode) {
  return {
    outlet: {
      findFirst: jest.fn().mockResolvedValue({ id: outletId, status: OutletStatus.ACTIVE }),
    },
    outletFiscalPolicy: {
      findFirst: jest.fn().mockResolvedValue({
        id: fiscalPolicyId,
        status: FiscalPolicyStatus.ACTIVE,
        taxProfileId: profileId,
      }),
    },
    taxProfile: {
      findFirst: jest.fn().mockResolvedValue({ id: profileId, taxMode }),
    },
    menuItem: {
      findMany: jest.fn().mockResolvedValue([{ id: menuItemId, categoryId }]),
    },
    taxCategoryMapping: {
      findMany: jest.fn().mockResolvedValue([
        {
          target: TaxMappingTarget.TENANT_DEFAULT,
          taxRule: {
            id: ruleId,
            taxGroupId: groupId,
            priority: 100,
            status: TaxRuleStatus.ACTIVE,
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
            effectiveTo: null,
            taxGroup: {
              id: groupId,
              status: TaxRateStatus.ACTIVE,
              effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
              effectiveTo: null,
              rates: [
                {
                  sortOrder: 1,
                  rate: {
                    id: '01975c30-0000-7000-8000-000000000801',
                    code: 'cgst_9',
                    name: 'CGST 9%',
                    component: 'CGST',
                    rateBps: 900,
                    status: TaxGroupStatus.ACTIVE,
                    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
                    effectiveTo: null,
                  },
                },
                {
                  sortOrder: 2,
                  rate: {
                    id: '01975c30-0000-7000-8000-000000000802',
                    code: 'sgst_9',
                    name: 'SGST 9%',
                    component: 'SGST',
                    rateBps: 900,
                    status: TaxGroupStatus.ACTIVE,
                    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
                    effectiveTo: null,
                  },
                },
              ],
            },
          },
        },
      ]),
    },
  };
}

describe('TaxCalculationService', () => {
  it('calculates exclusive tax and aggregates bill taxes deterministically', async () => {
    const service = new TaxCalculationService({} as PrismaService);
    const tx = txForMode(TaxMode.EXCLUSIVE);

    const result = await service.calculateForBill(tx as never, {
      tenantId,
      outletId,
      businessDate: new Date('2026-06-14T00:00:00.000Z'),
      currencyCode: 'INR',
      calculatedAt,
      items: [{ menuItemId, quantity: 1, unitPrice: 1000, discountAmount: 100 }],
    });

    expect(result.subtotalAmount).toBe(1000);
    expect(result.discountAmount).toBe(100);
    expect(result.taxableAmount).toBe(900);
    expect(result.taxAmount).toBe(162);
    expect(result.totalAmount).toBe(1062);
    expect(result.lines[0]).toMatchObject({
      taxRateBps: 1800,
      taxAmount: 162,
      totalAmount: 1062,
      taxMode: TaxMode.EXCLUSIVE,
    });
    expect(result.billTaxes).toEqual([
      { taxName: 'CGST', taxRate: 9, taxAmount: 81 },
      { taxName: 'SGST', taxRate: 9, taxAmount: 81 },
    ]);
  });

  it('backs tax out of inclusive prices without changing the customer total', async () => {
    const service = new TaxCalculationService({} as PrismaService);
    const tx = txForMode(TaxMode.INCLUSIVE);

    const result = await service.calculateForBill(tx as never, {
      tenantId,
      outletId,
      businessDate: new Date('2026-06-14T00:00:00.000Z'),
      currencyCode: 'INR',
      calculatedAt,
      items: [{ menuItemId, quantity: 1, unitPrice: 1180 }],
    });

    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(180);
    expect(result.totalAmount).toBe(1180);
    expect(result.lines[0].components).toEqual([
      { taxName: 'CGST', component: 'CGST', taxRateBps: 900, taxRate: 9, taxAmount: 90 },
      { taxName: 'SGST', component: 'SGST', taxRateBps: 900, taxRate: 9, taxAmount: 90 },
    ]);
  });

  it('allocates rounding remainders by largest fractional remainder', () => {
    expect(allocateByWeights(5, [1, 1, 1])).toEqual([2, 2, 1]);
    expect(proportionalRound(1180, 1800, 11800)).toBe(180);
  });
});
