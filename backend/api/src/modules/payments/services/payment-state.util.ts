import { BillPaymentStatus } from '@prisma/client';

export function deriveBillPaymentState(
  grandTotal: number,
  paidAmount: number,
  refundedAmount: number,
): { netPaid: number; outstandingAmount: number; paymentStatus: BillPaymentStatus } {
  const netPaid = paidAmount - refundedAmount;
  const outstandingAmount = Math.max(grandTotal - netPaid, 0);
  const paymentStatus =
    paidAmount > 0 && refundedAmount === paidAmount
      ? BillPaymentStatus.REFUNDED
      : netPaid >= grandTotal
        ? BillPaymentStatus.PAID
        : netPaid > 0
          ? BillPaymentStatus.PARTIALLY_PAID
          : BillPaymentStatus.UNPAID;
  return { netPaid, outstandingAmount, paymentStatus };
}
