import { ReceiptType } from '@prisma/client';
import type { PrintableReceipt } from './invoice-generator.service';
import { ReceiptTemplateService } from './receipt-template.service';

const payload: PrintableReceipt = {
  receipt: {
    number: 'REC-20260611-00001',
    invoiceNumber: null,
    type: ReceiptType.CUSTOMER_RECEIPT,
    verificationCode: 'ABC123',
    generatedAt: '2026-06-11T00:00:00.000Z',
  },
  outlet: {
    name: 'Test Outlet',
    phone: null,
    address: 'Test Street',
    taxRegistrationNumber: null,
  },
  customer: { name: null, phone: null, gstNumber: null },
  bill: {
    id: 'bill',
    number: 'BILL-20260611-00001',
    orderNumber: 'ORD-20260611-00001',
    currencyCode: 'INR',
    items: [
      {
        name: 'Meal',
        quantity: 1,
        unitPrice: 10000,
        discountAmount: 0,
        taxAmount: 500,
        taxPercentage: 5,
        lineTotal: 10500,
      },
    ],
    taxes: [
      { name: 'CGST', rate: 2.5, amount: 250 },
      { name: 'SGST', rate: 2.5, amount: 250 },
    ],
    payments: [
      {
        number: 'PAY-1',
        method: 'CASH',
        amount: 10500,
        referenceNumber: null,
      },
    ],
    summary: {
      subtotal: 10000,
      discountAmount: 0,
      couponDiscountAmount: 0,
      taxAmount: 500,
      serviceChargeAmount: 0,
      roundOffAmount: 0,
      grandTotal: 10500,
      paidAmount: 10500,
      changeReturned: 0,
    },
  },
  footer: {
    message: 'Thank you.',
    qrPayload: 'serveiq://receipt/test',
  },
};

describe('ReceiptTemplateService', () => {
  const service = new ReceiptTemplateService();

  it('formats 58mm and 80mm receipts from the immutable payload', () => {
    expect(service.format58mm(payload)).toContain('REC-20260611-00001');
    expect(service.format80mm(payload)).toContain('INR 105.00');
  });
});
