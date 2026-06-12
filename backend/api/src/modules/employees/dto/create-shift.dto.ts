import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateShiftDto {
  @IsOptional() @IsUUID() tenantId?: string;
  @IsUUID() outletId!: string;
  @IsString() @MaxLength(120) name!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endTime!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(720) breakMinutes = 0;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isNightShift = false;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive = true;
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}
