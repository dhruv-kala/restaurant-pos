import { ShiftSessionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class OpenShiftSessionDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  outletId!: string;

  @IsOptional()
  @IsUUID('all')
  assignedUserId?: string;

  @IsOptional()
  @IsUUID('all')
  shiftId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  openingNotes?: string | null;
}

export class CloseShiftSessionDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  closingNotes?: string | null;
}

export class ShiftSessionQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsUUID('all')
  businessDayId?: string;

  @IsOptional()
  @IsUUID('all')
  assignedUserId?: string;

  @IsOptional()
  @IsEnum(ShiftSessionStatus)
  status?: ShiftSessionStatus;

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

export class CurrentShiftSessionQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  assignedUserId?: string;
}

export class TenantShiftSessionQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}
