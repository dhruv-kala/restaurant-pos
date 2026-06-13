import {
  CommunicationPushApplication,
  CommunicationPushPlatform,
} from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class RegisterPushDeviceDto {
  @IsEnum(CommunicationPushApplication)
  application!: CommunicationPushApplication;

  @IsEnum(CommunicationPushPlatform)
  platform!: CommunicationPushPlatform;

  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  deviceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;
}
