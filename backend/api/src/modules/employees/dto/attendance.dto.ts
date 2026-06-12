import { AttendanceStatus } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AttendanceDto {
  @IsUUID() employeeId!: string;
  @IsOptional() @IsEnum(AttendanceStatus) status = AttendanceStatus.PRESENT;
  @IsOptional() @IsString() @MaxLength(500) remarks?: string;
  @IsOptional() @IsString() @MaxLength(120) deviceId?: string;
  @IsOptional() @IsObject() locationCaptured?: Record<string, unknown>;
}
