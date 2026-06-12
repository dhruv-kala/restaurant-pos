import {
  EmployeeDepartment,
  EmployeeGender,
  EmployeeStatus,
  EmploymentType,
} from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsOptional() @IsUUID() tenantId?: string;
  @IsUUID() outletId!: string;
  @IsUUID() userId!: string;
  @IsUUID() roleId!: string;
  @IsString() @MaxLength(40) employeeCode!: string;
  @IsString() @MaxLength(100) firstName!: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsEnum(EmployeeGender) gender?: EmployeeGender;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsDateString() dateOfJoining!: string;
  @IsString() @MaxLength(120) designation!: string;
  @IsEnum(EmployeeDepartment) department!: EmployeeDepartment;
  @IsEnum(EmploymentType) employmentType!: EmploymentType;
  @IsOptional() @IsInt() @Min(0) salary?: number;
  @IsOptional() @IsUUID() reportingManagerId?: string;
  @IsOptional() @IsUrl() @MaxLength(500) profileImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(35) preferredLanguage = 'en';
  @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(20) emergencyContactPhone?: string;
  @IsOptional() @IsEnum(EmployeeStatus) status = EmployeeStatus.ACTIVE;
}
