import { ApiPropertyOptional } from '@nestjs/swagger';
import { OutletStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class OutletQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: OutletStatus })
  @IsOptional()
  @IsEnum(OutletStatus)
  status?: OutletStatus;

  @ApiPropertyOptional({
    description: 'Available only to SUPER_ADMIN',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
