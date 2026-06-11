import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReceiptType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class GenerateReceiptDto {
  @ApiProperty()
  @IsUUID()
  billId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional({ enum: ReceiptType, default: ReceiptType.CUSTOMER_RECEIPT })
  @IsOptional()
  @IsEnum(ReceiptType)
  receiptType: ReceiptType = ReceiptType.CUSTOMER_RECEIPT;
}
