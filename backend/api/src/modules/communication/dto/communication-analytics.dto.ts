import { Transform } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsUUID } from 'class-validator';

export class CommunicationAnalyticsQueryDto {
  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsUUID('all')
  outletId?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => new Date(value))
  @IsDate()
  from?: Date;

  @IsOptional()
  @Transform(({ value }: { value: string }) => new Date(value))
  @IsDate()
  to?: Date;

  @IsOptional()
  @IsIn(['DAY', 'WEEK', 'MONTH'])
  groupBy: 'DAY' | 'WEEK' | 'MONTH' = 'DAY';
}
