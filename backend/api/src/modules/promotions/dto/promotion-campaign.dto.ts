import {
  DiscountValueType,
  PromotionCampaignOutletScope,
  PromotionCampaignStatus,
  PromotionRuleType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
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
  ValidateNested,
} from 'class-validator';

export class PromotionRuleInputDto {
  @IsEnum(PromotionRuleType)
  ruleType!: PromotionRuleType;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

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
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  minimumSubtotalMinor?: number | null;

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
  @IsInt()
  @Min(0)
  @Max(10_000)
  priority = 100;

  @IsOptional()
  @IsBoolean()
  isActive = true;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class CreatePromotionCampaignDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

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
  description?: string | null;

  @IsEnum(PromotionCampaignOutletScope)
  outletScope!: PromotionCampaignOutletScope;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  outletIds: string[] = [];

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  priority = 100;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PromotionRuleInputDto)
  rules!: PromotionRuleInputDto[];
}

export class UpdatePromotionCampaignDto {
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
  @IsEnum(PromotionCampaignOutletScope)
  outletScope?: PromotionCampaignOutletScope;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  outletIds?: string[];

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  priority?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PromotionRuleInputDto)
  rules?: PromotionRuleInputDto[];
}

export class ChangePromotionCampaignStatusDto {
  @IsInt()
  @Min(1)
  version!: number;
}

export class PromotionCampaignQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(PromotionCampaignStatus)
  status?: PromotionCampaignStatus;

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

export class EvaluatePromotionCampaignsDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  subtotalMinor?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;
}
