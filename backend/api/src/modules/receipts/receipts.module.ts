import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReceiptsController } from './controllers/receipts.controller';
import { InvoiceGeneratorService } from './services/invoice-generator.service';
import { ReceiptPdfService } from './services/receipt-pdf.service';
import { ReceiptTemplateService } from './services/receipt-template.service';
import { ReceiptsService } from './services/receipts.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, InvoiceGeneratorService, ReceiptTemplateService, ReceiptPdfService],
  exports: [ReceiptsService, ReceiptTemplateService],
})
export class ReceiptsModule {}
