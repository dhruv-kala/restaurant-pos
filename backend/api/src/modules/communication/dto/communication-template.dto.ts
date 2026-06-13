import { CommunicationChannel, CommunicationTemplateStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
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
  ValidateNested,
} from 'class-validator';

export class CommunicationTemplateVariableDto {
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  @MaxLength(80)
  key!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Equals(true)
  required = true;
}

export class CreateCommunicationTemplateDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]*$/)
  @MaxLength(120)
  templateKey!: string;

  @IsEnum(CommunicationChannel)
  channel!: CommunicationChannel;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(CommunicationTemplateStatus)
  status: CommunicationTemplateStatus = CommunicationTemplateStatus.DRAFT;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subjectTemplate?: string;

  @IsString()
  @MaxLength(20000)
  bodyTemplate!: string;

  @IsArray()
  @ArrayUnique((item: CommunicationTemplateVariableDto) => item.key)
  @ValidateNested({ each: true })
  @Type(() => CommunicationTemplateVariableDto)
  variables: CommunicationTemplateVariableDto[] = [];
}

export class UpdateCommunicationTemplateDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(CommunicationTemplateStatus)
  status?: CommunicationTemplateStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subjectTemplate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  bodyTemplate?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique((item: CommunicationTemplateVariableDto) => item.key)
  @ValidateNested({ each: true })
  @Type(() => CommunicationTemplateVariableDto)
  variables?: CommunicationTemplateVariableDto[];
}

export class CommunicationTemplateQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsEnum(CommunicationChannel)
  channel?: CommunicationChannel;

  @IsOptional()
  @IsEnum(CommunicationTemplateStatus)
  status?: CommunicationTemplateStatus;

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

export class CommunicationTemplateScopeDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;
}

export class PreviewCommunicationTemplateDto extends CommunicationTemplateScopeDto {
  @IsObject()
  values!: Record<string, unknown>;
}
