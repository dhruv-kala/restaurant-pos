import { EmployeeDepartment, EmployeeStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class EmployeeQueryDto {
  @IsOptional() @IsUUID() tenantId?: string;
  @IsOptional() @IsUUID() outletId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsEnum(EmployeeDepartment) department?: EmployeeDepartment;
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
  @IsOptional() @IsUUID() shiftId?: string;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @IsDateString() businessDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
