import { ReceiptType } from '@prisma/client';
import { ReceiptQueryDto } from './receipt-query.dto';

export class InvoiceQueryDto extends ReceiptQueryDto {
  override receiptType = ReceiptType.TAX_INVOICE;
}
