import { FiscalInvoiceSequenceStatus, FiscalPolicyStatus } from '@prisma/client';
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

export class FiscalPolicyQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(FiscalPolicyStatus)
  status?: FiscalPolicyStatus;

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

export class CreateOutletFiscalPolicyDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  outletId!: string;

  @IsOptional()
  @IsUUID('all')
  taxProfileId?: string | null;

  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{0,23}$/)
  @MaxLength(24)
  invoicePrefix!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  invoicePadding?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  fiscalYearStartDay?: number;

  @IsString()
  @MaxLength(64)
  timezone!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateOutletFiscalPolicyDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsUUID('all')
  taxProfileId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{0,23}$/)
  @MaxLength(24)
  invoicePrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  invoicePadding?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  fiscalYearStartDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsEnum(FiscalPolicyStatus)
  status?: FiscalPolicyStatus;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class FiscalSequenceQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsUUID('all')
  fiscalPolicyId?: string;

  @IsOptional()
  @IsEnum(FiscalInvoiceSequenceStatus)
  status?: FiscalInvoiceSequenceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  fiscalYearLabel?: string;

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

export class CreateFiscalInvoiceSequenceDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  outletId!: string;

  @IsUUID('all')
  fiscalPolicyId!: string;

  @IsString()
  @Matches(/^[0-9]{4}(-[0-9]{2,4})?$/)
  @MaxLength(16)
  fiscalYearLabel!: string;

  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{0,23}$/)
  @MaxLength(24)
  prefix!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  padding?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  startNumber?: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

export class UpdateFiscalInvoiceSequenceDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsEnum(FiscalInvoiceSequenceStatus)
  status?: FiscalInvoiceSequenceStatus;
}

export class GenerateFiscalInvoiceNumberDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}
