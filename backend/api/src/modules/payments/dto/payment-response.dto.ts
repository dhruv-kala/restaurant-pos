import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';

export class PaymentTransactionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod!: PaymentMethod;
  @ApiProperty() amount!: number;
  @ApiPropertyOptional({ nullable: true }) referenceNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) gatewayTransactionId!: string | null;
  @ApiPropertyOptional({ nullable: true }) upiTransactionId!: string | null;
  @ApiPropertyOptional({ nullable: true }) payerName!: string | null;
  @ApiPropertyOptional({ nullable: true }) cardLast4!: string | null;
  @ApiPropertyOptional({ nullable: true }) approvalCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) cashReceived!: number | null;
  @ApiPropertyOptional({ nullable: true }) changeReturned!: number | null;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiProperty() createdAt!: Date;
}

export class PaymentRefundResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() refundNumber!: string;
  @ApiProperty() refundAmount!: number;
  @ApiProperty() refundReason!: string;
  @ApiProperty({ enum: RefundStatus }) status!: RefundStatus;
  @ApiProperty() refundedByUserId!: string;
  @ApiPropertyOptional({ nullable: true }) refundedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export class PaymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() outletId!: string;
  @ApiProperty() billId!: string;
  @ApiProperty() paymentNumber!: string;
  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  paymentMethod!: PaymentMethod | null;
  @ApiProperty({ enum: PaymentSource }) paymentSource!: PaymentSource;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiProperty() amount!: number;
  @ApiProperty() paidAmount!: number;
  @ApiProperty() refundedAmount!: number;
  @ApiPropertyOptional({ nullable: true }) referenceNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) gatewayTransactionId!: string | null;
  @ApiPropertyOptional({ nullable: true }) upiTransactionId!: string | null;
  @ApiPropertyOptional({ nullable: true }) payerName!: string | null;
  @ApiPropertyOptional({ nullable: true }) cardLast4!: string | null;
  @ApiPropertyOptional({ nullable: true }) approvalCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) cashReceived!: number | null;
  @ApiPropertyOptional({ nullable: true }) changeReturned!: number | null;
  @ApiPropertyOptional({ nullable: true }) gatewayName!: string | null;
  @ApiPropertyOptional({ nullable: true }) gatewayReference!: string | null;
  @ApiPropertyOptional({ nullable: true }) deviceId!: string | null;
  @ApiPropertyOptional({ nullable: true }) terminalId!: string | null;
  @ApiPropertyOptional({ nullable: true }) shiftId!: string | null;
  @ApiProperty() businessDate!: Date;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty() createdByUserId!: string;
  @ApiPropertyOptional({ nullable: true }) paidByUserId!: string | null;
  @ApiPropertyOptional({ nullable: true }) paidAt!: Date | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: [PaymentTransactionResponseDto] })
  transactions!: PaymentTransactionResponseDto[];
  @ApiProperty({ type: [PaymentRefundResponseDto] })
  refunds!: PaymentRefundResponseDto[];
  @ApiProperty() bill!: unknown;
  @ApiProperty() createdBy!: unknown;
  @ApiPropertyOptional({ nullable: true }) paidBy!: unknown;
}

export class PaymentListResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] }) data!: PaymentResponseDto[];
  @ApiProperty() meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
