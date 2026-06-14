import { DiscountScope, DiscountValueType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CalculateDiscountDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsUUID('all')
  policyId?: string;

  @IsOptional()
  @IsEnum(DiscountScope)
  scope?: DiscountScope;

  @IsOptional()
  @IsEnum(DiscountValueType)
  valueType?: DiscountValueType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  percentageBps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amountMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  maxDiscountMinor?: number | null;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  baseAmountMinor!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode!: string;
}

export class ApplyManualDiscountDto extends CalculateDiscountDto {
  @IsOptional()
  @IsUUID('all')
  billId?: string;

  @IsOptional()
  @IsUUID('all')
  orderId?: string;

  @IsString()
  @MaxLength(160)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
