import { Transform, Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class TaxReportQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) => new Date(value))
  @IsDate()
  fromDate?: Date;

  @IsOptional()
  @Transform(({ value }: { value: string }) => new Date(value))
  @IsDate()
  toDate?: Date;

  @IsOptional()
  @Transform(({ value }: { value: string }) => new Date(value))
  @IsDate()
  businessDate?: Date;

  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
