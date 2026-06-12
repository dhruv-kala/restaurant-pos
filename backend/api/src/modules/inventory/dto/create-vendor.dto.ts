import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateVendorDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  gstNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  contactPerson?: string;

  @IsOptional()
  @IsBoolean()
  isActive = true;
}

export class UpdateVendorDto extends PartialType(CreateVendorDto) {}
