import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemStatus, OrderPriority, OrderStatus, OrderType } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() menuItemId!: string;
  @ApiPropertyOptional({ nullable: true }) variantId!: string | null;
  @ApiPropertyOptional({ nullable: true }) kitchenCategoryId!: string | null;
  @ApiPropertyOptional({ nullable: true }) kitchenStationId!: string | null;
  @ApiProperty() itemName!: string;
  @ApiPropertyOptional({ nullable: true }) variantName!: string | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() taxAmount!: number;
  @ApiProperty() lineTotal!: number;
  @ApiProperty() taxPercentage!: number;
  @ApiPropertyOptional({ nullable: true }) specialInstructions!: string | null;
  @ApiProperty({ enum: OrderItemStatus }) status!: OrderItemStatus;
  @ApiPropertyOptional({ nullable: true }) firedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) startedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) readyAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) servedAt!: Date | null;
  @ApiProperty() estimatedPrepMinutes!: number;
  @ApiPropertyOptional({ nullable: true }) actualPrepMinutes!: number | null;
  @ApiPropertyOptional({ nullable: true }) startedByUserId!: string | null;
  @ApiPropertyOptional({ nullable: true }) readyByUserId!: string | null;
  @ApiPropertyOptional({ nullable: true }) servedByUserId!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class OrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() outletId!: string;
  @ApiPropertyOptional({ nullable: true }) tableId!: string | null;
  @ApiPropertyOptional({ nullable: true }) customerId!: string | null;
  @ApiProperty() orderNumber!: string;
  @ApiProperty({ enum: OrderType }) orderType!: OrderType;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ enum: OrderPriority }) priority!: OrderPriority;
  @ApiPropertyOptional({ nullable: true })
  estimatedCompletionTime!: Date | null;
  @ApiPropertyOptional({ nullable: true }) waiterId!: string | null;
  @ApiProperty() guestCount!: number;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty() currencyCode!: string;
  @ApiProperty() subtotal!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() taxAmount!: number;
  @ApiProperty() serviceChargeAmount!: number;
  @ApiProperty() grandTotal!: number;
  @ApiPropertyOptional({ nullable: true }) cancellationReason!: string | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) cancelledAt!: Date | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: [OrderItemResponseDto] }) items!: OrderItemResponseDto[];
  @ApiPropertyOptional({ nullable: true }) table!: unknown;
  @ApiPropertyOptional({ nullable: true }) waiter!: unknown;
}

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderResponseDto] }) data!: OrderResponseDto[];
  @ApiProperty() meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
