import { OutboxEventScope, OutboxEventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class OutboxEventQueryDto {
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
  @IsEnum(OutboxEventStatus)
  status?: OutboxEventStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  eventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  aggregateType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  aggregateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  idempotencyKey?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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

export class OutboxEventScopeDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}
