import { BackgroundJobStatus, JobDeadLetterStatus, OutboxEventScope } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class JobQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(OutboxEventScope)
  scope?: OutboxEventScope;

  @IsOptional()
  @IsEnum(BackgroundJobStatus)
  status?: BackgroundJobStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  jobType?: string;

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

export class JobScopeDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}

export class ManualRetryJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CancelJobDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class UpsertRetryPolicyDto {
  @IsOptional()
  @IsEnum(OutboxEventScope)
  scope?: OutboxEventScope;

  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsString()
  @MaxLength(160)
  jobType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxAttempts!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(86_400)
  initialDelaySeconds!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(604_800)
  maxDelaySeconds!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  backoffMultiplier!: number;
}

export class RetryPolicyQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsEnum(OutboxEventScope)
  scope?: OutboxEventScope;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  jobType?: string;
}

export class DeadLetterQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(OutboxEventScope)
  scope?: OutboxEventScope;

  @IsOptional()
  @IsEnum(JobDeadLetterStatus)
  status?: JobDeadLetterStatus;

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

export class ResolveDeadLetterDto {
  @IsString()
  @MaxLength(500)
  resolutionNote!: string;
}
