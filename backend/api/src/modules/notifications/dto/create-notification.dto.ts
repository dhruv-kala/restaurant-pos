import { NotificationAudience, NotificationCategory, NotificationPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsEnum(NotificationAudience)
  audience!: NotificationAudience;

  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority: NotificationPriority = NotificationPriority.NORMAL;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMandatory = false;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
