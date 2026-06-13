import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;

export class StartTrialSubscriptionDto {
  @IsUUID('all')
  planId!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @Matches(idempotencyKeyPattern)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class ExtendTrialSubscriptionDto {
  @IsDateString()
  endsAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @Matches(idempotencyKeyPattern)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class ExpireTrialSubscriptionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @Matches(idempotencyKeyPattern)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class ConvertTrialSubscriptionDto {
  @IsUUID('all')
  planId!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @Matches(idempotencyKeyPattern)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class ExpireDueTrialsDto {
  @IsOptional()
  @IsDateString()
  asOf?: string;

  @IsString()
  @Matches(idempotencyKeyPattern)
  @MaxLength(100)
  idempotencyKey!: string;
}

export class TrialSubscriptionHistoryQueryDto {
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
