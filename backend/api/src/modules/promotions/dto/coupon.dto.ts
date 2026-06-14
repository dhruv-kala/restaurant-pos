import { CouponStatus, CouponType, DiscountValueType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
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

export class CreateCouponDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/)
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsEnum(CouponType)
  couponType!: CouponType;

  @IsOptional()
  @IsUUID('all')
  discountPolicyId?: string | null;

  @IsOptional()
  @IsEnum(DiscountValueType)
  valueType?: DiscountValueType | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  percentageBps?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amountMinor?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  maxDiscountMinor?: number | null;

  @IsOptional()
  @IsUUID('all')
  targetMenuCategoryId?: string | null;

  @IsOptional()
  @IsUUID('all')
  targetMenuItemId?: string | null;

  @IsOptional()
  @IsUUID('all')
  freeItemMenuItemId?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  totalUsageLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  perCustomerUsageLimit?: number | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class UpdateCouponDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsUUID('all')
  outletId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @IsOptional()
  @IsUUID('all')
  discountPolicyId?: string | null;

  @IsOptional()
  @IsEnum(DiscountValueType)
  valueType?: DiscountValueType | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  percentageBps?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amountMinor?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  maxDiscountMinor?: number | null;

  @IsOptional()
  @IsUUID('all')
  targetMenuCategoryId?: string | null;

  @IsOptional()
  @IsUUID('all')
  targetMenuItemId?: string | null;

  @IsOptional()
  @IsUUID('all')
  freeItemMenuItemId?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  totalUsageLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  perCustomerUsageLimit?: number | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class CouponQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @IsOptional()
  @IsEnum(CouponType)
  couponType?: CouponType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

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

export class ValidateCouponDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/)
  @MaxLength(64)
  code!: string;

  @IsOptional()
  @IsUUID('all')
  customerId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  baseAmountMinor?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;
}
