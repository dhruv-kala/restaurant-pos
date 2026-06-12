import { NotificationCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';

export class NotificationPreferenceInputDto {
  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @IsBoolean()
  inAppEnabled!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceInputDto)
  preferences!: NotificationPreferenceInputDto[];
}
