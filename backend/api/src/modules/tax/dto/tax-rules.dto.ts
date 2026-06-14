import {
  TaxComponent,
  TaxGroupStatus,
  TaxMappingTarget,
  TaxRateStatus,
  TaxRuleStatus,
  TaxType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TaxConfigurationQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  profileId?: string;

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

export class CreateTaxRateDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  profileId!: string;

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

  @IsEnum(TaxComponent)
  component!: TaxComponent;

  @IsEnum(TaxType)
  taxType!: TaxType;

  @IsInt()
  @Min(0)
  @Max(10000)
  rateBps!: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateTaxRateDto {
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
  @IsEnum(TaxRateStatus)
  status?: TaxRateStatus;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class CreateTaxGroupDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  profileId!: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  rateIds!: string[];

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateTaxGroupDto {
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
  @IsEnum(TaxGroupStatus)
  status?: TaxGroupStatus;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  rateIds?: string[];

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class CreateTaxRuleDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  profileId!: string;

  @IsUUID('all')
  taxGroupId!: string;

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

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateTaxRuleDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsUUID('all')
  taxGroupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsEnum(TaxRuleStatus)
  status?: TaxRuleStatus;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class CreateTaxCategoryMappingDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  taxRuleId!: string;

  @IsEnum(TaxMappingTarget)
  target!: TaxMappingTarget;

  @IsOptional()
  @IsUUID('all')
  menuCategoryId?: string | null;

  @IsOptional()
  @IsUUID('all')
  menuItemId?: string | null;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateTaxCategoryMappingDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsUUID('all')
  taxRuleId?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
