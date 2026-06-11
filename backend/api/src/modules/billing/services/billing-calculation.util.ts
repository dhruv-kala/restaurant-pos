import { BadRequestException } from '@nestjs/common';
import { GstMode } from '../enums/billing.enums';

export interface BillMoney {
  subtotal: number;
  discountAmount: number;
  couponDiscountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  roundOffAmount: number;
  grandTotal: number;
}

export function calculateBillMoney(input: Omit<BillMoney, 'roundOffAmount' | 'grandTotal'>): BillMoney {
  const beforeRound =
    input.subtotal -
    input.discountAmount -
    input.couponDiscountAmount +
    input.taxAmount +
    input.serviceChargeAmount;
  if (beforeRound < 0) throw new BadRequestException('Bill total cannot be negative');
  const rounded = Math.round(beforeRound / 100) * 100;
  return { ...input, roundOffAmount: rounded - beforeRound, grandTotal: rounded };
}

export function allocate(total: number, weights: number[]): number[] {
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  if (weightTotal <= 0) {
    const base = Math.floor(total / weights.length);
    return weights.map((_, index) => base + (index < total % weights.length ? 1 : 0));
  }
  const allocated = weights.map((weight) => Math.floor((total * weight) / weightTotal));
  let remainder = total - allocated.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % allocated.length) {
    allocated[index] += 1;
    remainder -= 1;
  }
  return allocated;
}

export function gstBreakdown(
  taxGroups: Array<{ rate: number; amount: number }>,
  mode: GstMode,
): Array<{ taxName: string; taxRate: number; taxAmount: number }> {
  return taxGroups.flatMap(({ rate, amount }) => {
    if (rate <= 0 || amount <= 0) return [];
    if (mode === GstMode.IGST) {
      return [{ taxName: 'IGST', taxRate: rate, taxAmount: amount }];
    }
    const cgst = Math.floor(amount / 2);
    return [
      { taxName: 'CGST', taxRate: rate / 2, taxAmount: cgst },
      { taxName: 'SGST', taxRate: rate / 2, taxAmount: amount - cgst },
    ];
  });
}
