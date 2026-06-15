import { BusinessDayStatus } from '@prisma/client';
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

export class OpenBusinessDayDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  outletId!: string;

  @IsDateString()
  businessDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  openingNotes?: string | null;
}

export class CloseBusinessDayDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  closingNotes?: string | null;
}

export class BusinessDayQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(BusinessDayStatus)
  status?: BusinessDayStatus;

  @IsOptional()
  @IsDateString()
  businessDate?: string;

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

export class CurrentBusinessDayQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  outletId!: string;
}

export class TenantBusinessDayQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}
