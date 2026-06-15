import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateShiftReconciliationDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  shiftSessionId!: string;

  @IsUUID('all')
  cashDrawerId!: string;

  @IsInt()
  @Min(0)
  countedCashMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  approvalNotes?: string | null;
}

export class ShiftReconciliationQueryDto {
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
  shiftSessionId?: string;

  @IsOptional()
  @IsUUID('all')
  cashDrawerId?: string;

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

export class TenantShiftReconciliationQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}
