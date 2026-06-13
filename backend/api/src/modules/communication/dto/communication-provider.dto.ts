import {
  CommunicationChannel,
  CommunicationProviderStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommunicationProviderDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsEnum(CommunicationChannel)
  channel!: CommunicationChannel;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_-]*$/)
  @MaxLength(80)
  providerKey!: string;

  @IsString()
  @MaxLength(160)
  displayName!: string;

  @IsOptional()
  @IsEnum(CommunicationProviderStatus)
  status: CommunicationProviderStatus = CommunicationProviderStatus.INACTIVE;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  priority = 100;

  @IsOptional()
  @IsString()
  @Matches(/^env:[A-Z][A-Z0-9_]*$/)
  @MaxLength(255)
  secretReference?: string;

  @IsOptional()
  @IsObject()
  configMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  capabilities?: Record<string, unknown>;
}

export class UpdateCommunicationProviderDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsEnum(CommunicationProviderStatus)
  status?: CommunicationProviderStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  priority?: number;

  @IsOptional()
  @IsString()
  @Matches(/^env:[A-Z][A-Z0-9_]*$/)
  @MaxLength(255)
  secretReference?: string;

  @IsOptional()
  @IsObject()
  configMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  capabilities?: Record<string, unknown>;
}

export class CommunicationProviderQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsEnum(CommunicationChannel)
  channel?: CommunicationChannel;

  @IsOptional()
  @IsEnum(CommunicationProviderStatus)
  status?: CommunicationProviderStatus;

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

export class CommunicationProviderScopeDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}
