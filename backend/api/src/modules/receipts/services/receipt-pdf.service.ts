import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { PrintableReceipt } from './invoice-generator.service';

@Injectable()
export class ReceiptPdfService {
  generate(payload: PrintableReceipt): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', margin: 44 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      const money = (value: number) => `${payload.bill.currencyCode} ${(value / 100).toFixed(2)}`;
      document.fontSize(18).text(payload.outlet.name, { align: 'center' });
      document.fontSize(9).text(payload.outlet.address, { align: 'center' });
      if (payload.outlet.phone !== null) {
        document.text(payload.outlet.phone, { align: 'center' });
      }
      document.moveDown();
      document.fontSize(14).text(payload.receipt.type.replaceAll('_', ' '), {
        align: 'center',
      });
      document
        .fontSize(10)
        .text(payload.receipt.invoiceNumber ?? payload.receipt.number, { align: 'center' });
      document.moveDown();
      document.text(`Receipt: ${payload.receipt.number}`);
      document.text(`Bill: ${payload.bill.number}`);
      document.text(`Order: ${payload.bill.orderNumber}`);
      document.text(`Issued: ${payload.receipt.generatedAt}`);
      if (payload.customer.name !== null) document.text(`Customer: ${payload.customer.name}`);
      if (payload.customer.gstNumber !== null)
        document.text(`Customer GST: ${payload.customer.gstNumber}`);
      document.moveDown();

      for (const item of payload.bill.items) {
        document.text(
          `${item.quantity} x ${item.name} @ ${money(item.unitPrice)}   ${money(item.lineTotal)}`,
        );
      }
      document.moveDown();
      document.text(`Subtotal: ${money(payload.bill.summary.subtotal)}`, { align: 'right' });
      document.text(
        `Discount: ${money(payload.bill.summary.discountAmount + payload.bill.summary.couponDiscountAmount)}`,
        { align: 'right' },
      );
      for (const tax of payload.bill.taxes) {
        document.text(`${tax.name} (${tax.rate}%): ${money(tax.amount)}`, { align: 'right' });
      }
      document.text(`Service charge: ${money(payload.bill.summary.serviceChargeAmount)}`, {
        align: 'right',
      });
      document
        .fontSize(13)
        .text(`Grand total: ${money(payload.bill.summary.grandTotal)}`, { align: 'right' });
      document.fontSize(10).moveDown();
      document.text('Payments');
      for (const payment of payload.bill.payments) {
        document.text(
          `${payment.method}: ${money(payment.amount)} ${payment.referenceNumber ?? ''}`,
        );
      }
      document.moveDown(2);
      document.rect(document.x, document.y, 90, 90).stroke();
      document.fontSize(8).text('QR verification payload', document.x + 8, document.y + 36, {
        width: 74,
        align: 'center',
      });
      document.moveDown(8);
      document.text(payload.footer.qrPayload);
      document.text(`Verification code: ${payload.receipt.verificationCode}`);
      document.moveDown();
      document.text(payload.footer.message, { align: 'center' });
      document.end();
    });
  }
}
