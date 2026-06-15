import { OutboxEventScope, ScheduledJobScheduleType, ScheduledJobStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScheduledJobDto {
  @IsEnum(OutboxEventScope)
  scope: OutboxEventScope = OutboxEventScope.TENANT;

  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsString()
  @MaxLength(120)
  scheduleKey!: string;

  @IsString()
  @MaxLength(160)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MaxLength(160)
  jobType!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsEnum(ScheduledJobScheduleType)
  scheduleType!: ScheduledJobScheduleType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cronExpression?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(31_536_000)
  intervalSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsDateString()
  nextRunAt?: string;
}

export class ScheduledJobQueryDto {
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
  @IsEnum(ScheduledJobStatus)
  status?: ScheduledJobStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  scheduleKey?: string;

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

export class ScheduledJobScopeDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}

export class ChangeScheduledJobStatusDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}
