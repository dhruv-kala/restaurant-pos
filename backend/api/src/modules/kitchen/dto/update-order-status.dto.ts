import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateKitchenOrderStatusDto {
  @ApiProperty({
    enum: [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED, OrderStatus.COMPLETED],
  })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
