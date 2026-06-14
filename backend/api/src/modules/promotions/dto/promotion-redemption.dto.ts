import { PromotionRedemptionSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { DiscountEligibilityItemDto } from './discount-eligibility.dto';

export class RedeemPromotionDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsUUID('all')
  billId!: string;

  @IsOptional()
  @IsUUID('all')
  orderId?: string;

  @IsOptional()
  @IsUUID('all')
  customerId?: string;

  @IsEnum(PromotionRedemptionSource)
  source!: PromotionRedemptionSource;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/)
  @MaxLength(64)
  couponCode?: string;

  @IsOptional()
  @IsUUID('all')
  campaignId?: string;

  @IsOptional()
  @IsUUID('all')
  promotionRuleId?: string;

  @IsOptional()
  @IsUUID('all')
  discountPolicyId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  subtotalMinor?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscountEligibilityItemDto)
  items?: DiscountEligibilityItemDto[];

  @IsString()
  @MaxLength(160)
  idempotencyKey!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class PromotionRedemptionQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsUUID('all')
  billId?: string;

  @IsOptional()
  @IsUUID('all')
  orderId?: string;

  @IsOptional()
  @IsUUID('all')
  customerId?: string;

  @IsOptional()
  @IsUUID('all')
  couponId?: string;

  @IsOptional()
  @IsUUID('all')
  campaignId?: string;

  @IsOptional()
  @IsEnum(PromotionRedemptionSource)
  source?: PromotionRedemptionSource;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
