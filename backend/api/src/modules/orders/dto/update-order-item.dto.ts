import { PartialType, PickType } from '@nestjs/swagger';
import { AddOrderItemDto } from './add-order-item.dto';

export class UpdateOrderItemDto extends PartialType(
  PickType(AddOrderItemDto, ['quantity', 'specialInstructions'] as const),
) {}
