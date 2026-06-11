import { BillPaymentStatus } from '@prisma/client';
import { deriveBillPaymentState } from './payment-state.util';

describe('bill payment state', () => {
  it('tracks a partial payment', () => {
    expect(deriveBillPaymentState(1000, 400, 0)).toEqual({
      netPaid: 400,
      outstandingAmount: 600,
      paymentStatus: BillPaymentStatus.PARTIALLY_PAID,
    });
  });

  it('marks a fully paid bill', () => {
    expect(deriveBillPaymentState(1000, 1000, 0).paymentStatus).toBe(
      BillPaymentStatus.PAID,
    );
  });

  it('reopens the balance after a partial refund', () => {
    expect(deriveBillPaymentState(1000, 1000, 250)).toEqual({
      netPaid: 750,
      outstandingAmount: 250,
      paymentStatus: BillPaymentStatus.PARTIALLY_PAID,
    });
  });

  it('marks all collected funds refunded', () => {
    expect(deriveBillPaymentState(1000, 1000, 1000).paymentStatus).toBe(
      BillPaymentStatus.REFUNDED,
    );
  });
});
