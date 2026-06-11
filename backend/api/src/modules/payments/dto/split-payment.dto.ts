import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaymentTenderDto } from './payment-tender.dto';

export class SplitPaymentDto {
  @ApiProperty()
  @IsUUID()
  billId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  idempotencyKey!: string;

  @ApiProperty({ type: [PaymentTenderDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PaymentTenderDto)
  payments!: PaymentTenderDto[];

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
}
