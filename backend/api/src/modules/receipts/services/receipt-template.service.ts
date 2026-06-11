import { Injectable } from '@nestjs/common';
import type { PrintableReceipt } from './invoice-generator.service';

@Injectable()
export class ReceiptTemplateService {
  format58mm(payload: PrintableReceipt): string {
    return this.format(payload, 32);
  }

  format80mm(payload: PrintableReceipt): string {
    return this.format(payload, 48);
  }

  private format(payload: PrintableReceipt, width: number): string {
    const money = (value: number) => `${payload.bill.currencyCode} ${(value / 100).toFixed(2)}`;
    const divider = '-'.repeat(width);
    const lines = [
      payload.outlet.name.toUpperCase(),
      payload.outlet.address,
      payload.outlet.phone ?? '',
      divider,
      `${payload.receipt.type.replaceAll('_', ' ')} ${payload.receipt.invoiceNumber ?? payload.receipt.number}`,
      `Bill ${payload.bill.number}  Order ${payload.bill.orderNumber}`,
      divider,
      ...payload.bill.items.map(
        (item) => `${item.quantity} x ${item.name}  ${money(item.lineTotal)}`,
      ),
      divider,
      `Subtotal ${money(payload.bill.summary.subtotal)}`,
      `Tax ${money(payload.bill.summary.taxAmount)}`,
      `TOTAL ${money(payload.bill.summary.grandTotal)}`,
      ...payload.bill.payments.map((payment) => `${payment.method} ${money(payment.amount)}`),
      divider,
      payload.footer.message,
      `Verify: ${payload.receipt.verificationCode}`,
      payload.footer.qrPayload,
    ];
    return lines.filter((line) => line.length > 0).join('\n');
  }
}
