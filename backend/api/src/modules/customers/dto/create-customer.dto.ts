import {
  CustomerGender,
  CustomerSource,
  CustomerStatus,
  CustomerType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @IsOptional() @IsUUID() tenantId?: string;
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() @MaxLength(160) displayName?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsEnum(CustomerGender) gender?: CustomerGender;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsDateString() anniversaryDate?: string;
  @IsOptional() @IsString() @MaxLength(32) gstNumber?: string;
  @IsOptional() @IsEnum(CustomerType) customerType = CustomerType.WALK_IN;
  @IsOptional() @IsEnum(CustomerStatus) status = CustomerStatus.ACTIVE;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsEnum(CustomerSource) source = CustomerSource.POS;
  @IsOptional() @Type(() => Boolean) @IsBoolean() smsOptIn = false;
  @IsOptional() @Type(() => Boolean) @IsBoolean() emailOptIn = false;
  @IsOptional() @Type(() => Boolean) @IsBoolean() whatsappOptIn = false;
}
