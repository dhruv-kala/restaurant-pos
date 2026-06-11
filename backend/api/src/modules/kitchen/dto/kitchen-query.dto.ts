import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemStatus, OrderPriority, OrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class KitchenQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @ApiPropertyOptional({ enum: OrderPriority })
  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: OrderItemStatus })
  @IsOptional()
  @IsEnum(OrderItemStatus)
  itemStatus?: OrderItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 200, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit = 200;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: string }) => new Date(value))
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: string }) => new Date(value))
  @IsDate()
  toDate?: Date;
}
