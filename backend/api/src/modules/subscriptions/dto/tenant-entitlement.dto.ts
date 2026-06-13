import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertTenantEntitlementDto {
  @IsBoolean()
  isEnabled!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limitValue?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/)
  @MaxLength(160)
  idempotencyKey!: string;
}

export class RevokeTenantEntitlementDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/)
  @MaxLength(160)
  idempotencyKey!: string;
}
