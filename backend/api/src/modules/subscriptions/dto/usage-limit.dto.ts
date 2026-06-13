import { UsageCounterPeriod } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class AdjustUsageCounterDto {
  @IsString()
  @Matches(/^(0|[1-9][0-9]{0,18})$/)
  usageValue!: string;

  @IsOptional()
  @IsEnum(UsageCounterPeriod)
  period?: UsageCounterPeriod;

  @IsOptional()
  @IsDateString()
  periodAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/)
  @MaxLength(160)
  idempotencyKey!: string;
}
