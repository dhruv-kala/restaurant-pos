import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrinterType, ReceiptStatus, ReceiptType } from '@prisma/client';

export class ReceiptPrintLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() printedByUserId!: string;
  @ApiProperty() printerName!: string;
  @ApiProperty({ enum: PrinterType }) printerType!: PrinterType;
  @ApiProperty() copies!: number;
  @ApiProperty() isReprint!: boolean;
  @ApiProperty() printedAt!: Date;
  @ApiProperty() printedBy!: unknown;
}

export class ReceiptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() outletId!: string;
  @ApiProperty() billId!: string;
  @ApiPropertyOptional({ nullable: true }) paymentId!: string | null;
  @ApiProperty() receiptNumber!: string;
  @ApiPropertyOptional({ nullable: true }) invoiceNumber!: string | null;
  @ApiProperty({ enum: ReceiptType }) receiptType!: ReceiptType;
  @ApiProperty({ enum: ReceiptStatus }) status!: ReceiptStatus;
  @ApiProperty() printablePayload!: unknown;
  @ApiProperty() verificationCode!: string;
  @ApiProperty() qrPayload!: string;
  @ApiProperty() printCount!: number;
  @ApiPropertyOptional({ nullable: true }) lastPrintedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) pdfUrl!: string | null;
  @ApiProperty() generatedByUserId!: string;
  @ApiProperty() generatedAt!: Date;
  @ApiProperty() version!: number;
  @ApiProperty({ type: [ReceiptPrintLogResponseDto] })
  printLogs!: ReceiptPrintLogResponseDto[];
  @ApiProperty() generatedBy!: unknown;
}

export class ReceiptListResponseDto {
  @ApiProperty({ type: [ReceiptResponseDto] }) data!: ReceiptResponseDto[];
  @ApiProperty() meta!: { page: number; limit: number; total: number; totalPages: number };
}
