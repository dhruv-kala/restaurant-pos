import { CashDrawerStatus, CashDrawerTransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
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

export class OpenCashDrawerDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  shiftSessionId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @IsInt()
  @Min(0)
  openingBalanceMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  openingNotes?: string | null;
}

export class CreateCashDrawerTransactionDto {
  @IsEnum(CashDrawerTransactionType)
  transactionType!: CashDrawerTransactionType;

  @IsInt()
  @Min(0)
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class CloseCashDrawerDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsInt()
  @Min(0)
  closingBalanceMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  closingNotes?: string | null;
}

export class CashDrawerQueryDto {
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
  @IsEnum(CashDrawerStatus)
  status?: CashDrawerStatus;

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

export class CurrentCashDrawerQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  shiftSessionId!: string;
}

export class TenantCashDrawerQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}
