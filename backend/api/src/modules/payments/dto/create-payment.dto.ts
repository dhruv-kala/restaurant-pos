import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentSource } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaymentTenderDto } from './payment-tender.dto';

export class CreatePaymentDto extends PaymentTenderDto {
  @ApiProperty()
  @IsUUID()
  billId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  idempotencyKey!: string;

  @ApiPropertyOptional({ enum: PaymentSource, default: PaymentSource.POS })
  @IsOptional()
  @IsEnum(PaymentSource)
  paymentSource?: PaymentSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  terminalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
