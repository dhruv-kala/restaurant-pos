import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillSource } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { GstMode } from '../enums/billing.enums';

export class GenerateBillDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional({ enum: BillSource, default: BillSource.POS })
  @IsOptional()
  @IsEnum(BillSource)
  billSource?: BillSource;

  @ApiPropertyOptional({ enum: GstMode, default: GstMode.CGST_SGST })
  @IsOptional()
  @IsEnum(GstMode)
  gstMode?: GstMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  customerGSTNumber?: string;

  @ApiPropertyOptional({ description: 'Additional bill-level discount in minor units.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Service charge in minor units.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  serviceChargeAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
