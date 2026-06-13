import { TenantSubscriptionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
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

export class ActivateTenantSubscriptionDto {
  @IsUUID('all')
  planId!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/)
  @MaxLength(160)
  idempotencyKey!: string;
}

export class ChangeTenantSubscriptionPlanDto {
  @IsUUID('all')
  planId!: string;

  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/)
  @MaxLength(160)
  idempotencyKey!: string;
}

export class ChangeTenantSubscriptionStatusDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/)
  @MaxLength(160)
  idempotencyKey!: string;
}

export class TenantSubscriptionQueryDto {
  @IsOptional()
  @IsEnum(TenantSubscriptionStatus)
  status?: TenantSubscriptionStatus;

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

export class TenantSubscriptionHistoryQueryDto {
  @IsOptional()
  @IsUUID('all')
  subscriptionId?: string;

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
