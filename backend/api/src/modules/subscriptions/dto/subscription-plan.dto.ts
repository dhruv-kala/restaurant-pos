import { SubscriptionBillingInterval, SubscriptionPlanStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SubscriptionPlanFeatureInputDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_.-]*$/)
  @MaxLength(120)
  featureKey!: string;

  @IsOptional()
  @IsBoolean()
  isEnabled = true;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  limitValue?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateSubscriptionPlanDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]*$/)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(SubscriptionBillingInterval)
  billingInterval!: SubscriptionBillingInterval;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  priceMinor!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SubscriptionPlanFeatureInputDto)
  features: SubscriptionPlanFeatureInputDto[] = [];
}

export class UpdateSubscriptionPlanDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsEnum(SubscriptionBillingInterval)
  billingInterval?: SubscriptionBillingInterval;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  priceMinor?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;
}

export class ReplaceSubscriptionPlanFeaturesDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SubscriptionPlanFeatureInputDto)
  features!: SubscriptionPlanFeatureInputDto[];
}

export class ChangeSubscriptionPlanStatusDto {
  @IsInt()
  @Min(1)
  version!: number;
}

export class SubscriptionPlanQueryDto {
  @IsOptional()
  @IsEnum(SubscriptionPlanStatus)
  status?: SubscriptionPlanStatus;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]*$/)
  @MaxLength(80)
  code?: string;

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
