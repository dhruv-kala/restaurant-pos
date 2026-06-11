import { Injectable } from '@nestjs/common';
import { PaymentStatus, ReceiptType } from '@prisma/client';

export interface PrintableReceipt {
  receipt: {
    number: string;
    invoiceNumber: string | null;
    type: ReceiptType;
    verificationCode: string;
    generatedAt: string;
  };
  outlet: {
    name: string;
    phone: string | null;
    address: string;
    taxRegistrationNumber: string | null;
  };
  customer: { name: string | null; phone: string | null; gstNumber: string | null };
  bill: {
    id: string;
    number: string;
    orderNumber: string;
    currencyCode: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxAmount: number;
      taxPercentage: number;
      lineTotal: number;
    }>;
    taxes: Array<{ name: string; rate: number; amount: number }>;
    payments: Array<{
      number: string;
      method: string;
      amount: number;
      referenceNumber: string | null;
    }>;
    summary: {
      subtotal: number;
      discountAmount: number;
      couponDiscountAmount: number;
      taxAmount: number;
      serviceChargeAmount: number;
      roundOffAmount: number;
      grandTotal: number;
      paidAmount: number;
      changeReturned: number;
    };
  };
  footer: { message: string; qrPayload: string };
}

interface InvoiceSource {
  id: string;
  billNumber: string;
  currencyCode: string;
  customerName: string | null;
  customerPhone: string | null;
  customerGSTNumber: string | null;
  subtotal: number;
  discountAmount: number;
  couponDiscountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  roundOffAmount: number;
  grandTotal: number;
  paidAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    taxPercentage: { toNumber(): number };
    lineTotal: number;
  }>;
  taxes: Array<{ taxName: string; taxRate: { toNumber(): number }; taxAmount: number }>;
  payments: Array<{
    paymentNumber: string;
    paymentMethod: string | null;
    paidAmount: number;
    referenceNumber: string | null;
    status: PaymentStatus;
    transactions: Array<{
      paymentMethod: string;
      amount: number;
      referenceNumber: string | null;
      changeReturned: number | null;
      status: PaymentStatus;
    }>;
  }>;
  order: { orderNumber: string };
  outlet: {
    name: string;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  };
  tenant: { legalName: string | null; name: string };
}

@Injectable()
export class InvoiceGeneratorService {
  build(
    source: InvoiceSource,
    identity: {
      receiptNumber: string;
      invoiceNumber: string | null;
      receiptType: ReceiptType;
      verificationCode: string;
      qrPayload: string;
      generatedAt: Date;
    },
  ): PrintableReceipt {
    const payments = source.payments.flatMap((payment) => {
      const successful = payment.transactions.filter(
        (transaction) => transaction.status === PaymentStatus.SUCCESS,
      );
      if (successful.length > 0) {
        return successful.map((transaction) => ({
          number: payment.paymentNumber,
          method: transaction.paymentMethod,
          amount: transaction.amount,
          referenceNumber: transaction.referenceNumber,
        }));
      }
      return payment.status === PaymentStatus.SUCCESS
        ? [
            {
              number: payment.paymentNumber,
              method: payment.paymentMethod ?? 'UNKNOWN',
              amount: payment.paidAmount,
              referenceNumber: payment.referenceNumber,
            },
          ]
        : [];
    });
    const address = [
      source.outlet.addressLine1,
      source.outlet.addressLine2,
      source.outlet.city,
      source.outlet.state,
      source.outlet.postalCode,
    ]
      .filter((part): part is string => part !== null && part.trim().length > 0)
      .join(', ');
    return {
      receipt: {
        number: identity.receiptNumber,
        invoiceNumber: identity.invoiceNumber,
        type: identity.receiptType,
        verificationCode: identity.verificationCode,
        generatedAt: identity.generatedAt.toISOString(),
      },
      outlet: {
        name: source.outlet.name || source.tenant.legalName || source.tenant.name,
        phone: source.outlet.phone,
        address,
        taxRegistrationNumber: null,
      },
      customer: {
        name: source.customerName,
        phone: source.customerPhone,
        gstNumber: source.customerGSTNumber,
      },
      bill: {
        id: source.id,
        number: source.billNumber,
        orderNumber: source.order.orderNumber,
        currencyCode: source.currencyCode,
        items: source.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          taxPercentage: item.taxPercentage.toNumber(),
          lineTotal: item.lineTotal,
        })),
        taxes: source.taxes.map((tax) => ({
          name: tax.taxName,
          rate: tax.taxRate.toNumber(),
          amount: tax.taxAmount,
        })),
        payments,
        summary: {
          subtotal: source.subtotal,
          discountAmount: source.discountAmount,
          couponDiscountAmount: source.couponDiscountAmount,
          taxAmount: source.taxAmount,
          serviceChargeAmount: source.serviceChargeAmount,
          roundOffAmount: source.roundOffAmount,
          grandTotal: source.grandTotal,
          paidAmount: source.paidAmount,
          changeReturned: source.payments.reduce(
            (sum, payment) =>
              sum +
              payment.transactions.reduce(
                (transactionSum, transaction) =>
                  transactionSum +
                  (transaction.status === PaymentStatus.SUCCESS
                    ? (transaction.changeReturned ?? 0)
                    : 0),
                0,
              ),
            0,
          ),
        },
      },
      footer: {
        message: 'Thank you for dining with us.',
        qrPayload: identity.qrPayload,
      },
    };
  }
}
