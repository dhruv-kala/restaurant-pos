import { ApiProperty } from '@nestjs/swagger';
import { OrderItemStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateItemStatusDto {
  @ApiProperty({
    enum: [OrderItemStatus.PREPARING, OrderItemStatus.READY, OrderItemStatus.SERVED],
  })
  @IsEnum(OrderItemStatus)
  status!: OrderItemStatus;
}
