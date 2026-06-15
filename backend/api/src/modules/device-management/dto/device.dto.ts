import {
  DeviceAssignmentStatus,
  DeviceSecurityPolicyStatus,
  DeviceStatus,
  DeviceType,
  TerminalStatus,
  TerminalType,
  TrustedSessionStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
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

export class CreateTerminalDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsUUID('all')
  outletId!: string;

  @IsString()
  @MaxLength(80)
  terminalCode!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsEnum(TerminalType)
  terminalType!: TerminalType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class TerminalQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(TerminalStatus)
  status?: TerminalStatus;

  @IsOptional()
  @IsEnum(TerminalType)
  terminalType?: TerminalType;

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

export class UpdateTerminalDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(TerminalStatus)
  status?: TerminalStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsInt()
  @Min(1)
  version!: number;
}

export class AssignDeviceToTerminalDto {
  @IsUUID('all')
  deviceId!: string;

  @IsInt()
  @Min(1)
  terminalVersion!: number;
}

export class DeviceAssignmentQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  terminalId?: string;

  @IsOptional()
  @IsUUID('all')
  deviceId?: string;

  @IsOptional()
  @IsEnum(DeviceAssignmentStatus)
  status?: DeviceAssignmentStatus;

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

export class EndDeviceAssignmentDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class CreateDeviceSecurityPolicyDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string | null;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsBoolean()
  requireTrustedSession = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(43200)
  sessionTimeoutMinutes = 1440;

  @IsOptional()
  @IsDateString()
  forceLogoutBefore?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(DeviceType, { each: true })
  allowedDeviceTypes: DeviceType[] = [];

  @IsOptional()
  @IsObject()
  restrictions?: Record<string, unknown> | null;
}

export class DeviceSecurityPolicyQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsEnum(DeviceSecurityPolicyStatus)
  status?: DeviceSecurityPolicyStatus;

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

export class UpdateDeviceSecurityPolicyDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(DeviceSecurityPolicyStatus)
  status?: DeviceSecurityPolicyStatus;

  @IsOptional()
  @IsBoolean()
  requireTrustedSession?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(43200)
  sessionTimeoutMinutes?: number;

  @IsOptional()
  @IsDateString()
  forceLogoutBefore?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(DeviceType, { each: true })
  allowedDeviceTypes?: DeviceType[];

  @IsOptional()
  @IsObject()
  restrictions?: Record<string, unknown> | null;

  @IsInt()
  @Min(1)
  version!: number;
}

export class EvaluateDeviceSecurityPolicyQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}
