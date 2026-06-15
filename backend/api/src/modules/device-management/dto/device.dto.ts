import { DeviceStatus, DeviceType, TrustedSessionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
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

export class RegisterDeviceDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string | null;

  @IsString()
  @MaxLength(160)
  deviceIdentifier!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsEnum(DeviceType)
  deviceType!: DeviceType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  platform?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  manufacturer?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  osVersion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  appVersion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  serialNumber?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class DeviceQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

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

export class TenantDeviceQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}

export class UpdateDeviceStatusDto {
  @IsEnum(DeviceStatus)
  status!: DeviceStatus;

  @IsInt()
  @Min(1)
  version!: number;
}

export class RequestDeviceEnrollmentDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  expiresInMinutes = 15;
}

export class DeviceEnrollmentQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

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

export class ApproveDeviceEnrollmentDto {
  @IsInt()
  @Min(1)
  version!: number;
}

export class ActivateDeviceEnrollmentDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsString()
  @MaxLength(160)
  deviceIdentifier!: string;

  @IsString()
  @MaxLength(64)
  activationCode!: string;
}

export class CreateTrustedSessionDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(43200)
  expiresInMinutes = 1440;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string | null;
}

export class TrustedSessionQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  deviceId?: string;

  @IsOptional()
  @IsUUID('all')
  userId?: string;

  @IsOptional()
  @IsEnum(TrustedSessionStatus)
  status?: TrustedSessionStatus;

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

export class RenewTrustedSessionDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(43200)
  expiresInMinutes = 1440;
}

export class RevokeTrustedSessionDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
