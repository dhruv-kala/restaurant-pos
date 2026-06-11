import { BadRequestException } from '@nestjs/common';
import { GstMode } from '../enums/billing.enums';
import { allocate, calculateBillMoney, gstBreakdown } from './billing-calculation.util';

describe('billing calculations', () => {
  it('applies the billing formula and rounds to the nearest rupee', () => {
    expect(
      calculateBillMoney({
        subtotal: 1000,
        discountAmount: 100,
        couponDiscountAmount: 0,
        taxAmount: 162,
        serviceChargeAmount: 50,
      }),
    ).toEqual({
      subtotal: 1000,
      discountAmount: 100,
      couponDiscountAmount: 0,
      taxAmount: 162,
      serviceChargeAmount: 50,
      roundOffAmount: -12,
      grandTotal: 1100,
    });
  });

  it('rejects negative totals', () => {
    expect(() =>
      calculateBillMoney({
        subtotal: 100,
        discountAmount: 200,
        couponDiscountAmount: 0,
        taxAmount: 0,
        serviceChargeAmount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('allocates every minor unit deterministically', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('creates balanced CGST and SGST breakdowns', () => {
    expect(gstBreakdown([{ rate: 18, amount: 181 }], GstMode.CGST_SGST)).toEqual([
      { taxName: 'CGST', taxRate: 9, taxAmount: 90 },
      { taxName: 'SGST', taxRate: 9, taxAmount: 91 },
    ]);
  });
});
