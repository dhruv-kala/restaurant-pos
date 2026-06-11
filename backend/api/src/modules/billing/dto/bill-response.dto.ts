import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillPaymentStatus, BillSource, BillStatus } from '@prisma/client';

export class BillItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderItemId!: string;
  @ApiProperty() menuItemId!: string;
  @ApiPropertyOptional({ nullable: true }) kitchenCategoryId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() taxAmount!: number;
  @ApiProperty() taxPercentage!: number;
  @ApiProperty() lineTotal!: number;
  @ApiPropertyOptional({ nullable: true }) preparationTimeMinutes!: number | null;
}

export class BillTaxResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() taxName!: string;
  @ApiProperty() taxRate!: number;
  @ApiProperty() taxAmount!: number;
}

export class BillResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() outletId!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() billNumber!: string;
  @ApiPropertyOptional({ nullable: true }) invoiceNumber!: string | null;
  @ApiProperty({ enum: BillStatus }) status!: BillStatus;
  @ApiProperty({ enum: BillPaymentStatus }) paymentStatus!: BillPaymentStatus;
  @ApiProperty({ enum: BillSource }) billSource!: BillSource;
  @ApiProperty() currencyCode!: string;
  @ApiPropertyOptional({ nullable: true }) customerName!: string | null;
  @ApiPropertyOptional({ nullable: true }) customerPhone!: string | null;
  @ApiPropertyOptional({ nullable: true }) customerGSTNumber!: string | null;
  @ApiProperty() subtotal!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() taxAmount!: number;
  @ApiProperty() serviceChargeAmount!: number;
  @ApiProperty() roundOffAmount!: number;
  @ApiProperty() grandTotal!: number;
  @ApiProperty() paidAmount!: number;
  @ApiProperty() refundedAmount!: number;
  @ApiProperty() outstandingAmount!: number;
  @ApiProperty() loyaltyPointsEarned!: number;
  @ApiProperty() loyaltyPointsRedeemed!: number;
  @ApiPropertyOptional({ nullable: true }) couponCode!: string | null;
  @ApiProperty() couponDiscountAmount!: number;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty({ type: [String] }) sourceBillIds!: string[];
  @ApiProperty() generatedByUserId!: string;
  @ApiProperty() generatedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) voidReason!: string | null;
  @ApiPropertyOptional({ nullable: true }) voidedByUserId!: string | null;
  @ApiPropertyOptional({ nullable: true }) voidedAt!: Date | null;
  @ApiProperty() printCount!: number;
  @ApiPropertyOptional({ nullable: true }) lastPrintedAt!: Date | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: [BillItemResponseDto] }) items!: BillItemResponseDto[];
  @ApiProperty({ type: [BillTaxResponseDto] }) taxes!: BillTaxResponseDto[];
  @ApiProperty() order!: unknown;
  @ApiProperty() generatedBy!: unknown;
  @ApiPropertyOptional({ nullable: true }) voidedBy!: unknown;
}

export class BillListResponseDto {
  @ApiProperty({ type: [BillResponseDto] }) data!: BillResponseDto[];
  @ApiProperty() meta!: { page: number; limit: number; total: number; totalPages: number };
}

export class PrintableBillResponseDto extends BillResponseDto {
  @ApiProperty() reprint!: boolean;
  @ApiProperty() printedAt!: Date;
}
