import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillPaymentStatus,
  BillStatus,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreatePaymentDto } from '../dto/create-payment.dto';
import type { PaymentQueryDto } from '../dto/payment-query.dto';
import type {
  PaymentListResponseDto,
  PaymentResponseDto,
} from '../dto/payment-response.dto';
import type { PaymentTenderDto } from '../dto/payment-tender.dto';
import type { RefundPaymentDto } from '../dto/refund-payment.dto';
import type { SplitPaymentDto } from '../dto/split-payment.dto';
import type { UpdatePaymentStatusDto } from '../dto/update-payment-status.dto';
import { PaymentEventsService } from '../events/payment-events.service';
import {
  requirePaymentRead,
  requirePaymentWrite,
  resolvePaymentScope,
} from './payment-access.util';
import { deriveBillPaymentState } from './payment-state.util';

const paymentInclude = {
  transactions: { orderBy: { createdAt: 'asc' } },
  refunds: { orderBy: { createdAt: 'asc' } },
  bill: {
    select: {
      id: true,
      billNumber: true,
      grandTotal: true,
      paidAmount: true,
      refundedAmount: true,
      outstandingAmount: true,
      paymentStatus: true,
      currencyCode: true,
    },
  },
  createdBy: { select: { id: true, displayName: true } },
  paidBy: { select: { id: true, displayName: true } },
} satisfies Prisma.PaymentInclude;

type PaymentRecord = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: PaymentEventsService,
  ) {}

  async create(dto: CreatePaymentDto, user: AuthenticatedUser): Promise<PaymentResponseDto> {
    requirePaymentWrite(user);
    return this.createAggregate(dto.billId, dto.idempotencyKey, [dto], dto, user);
  }

  async split(dto: SplitPaymentDto, user: AuthenticatedUser): Promise<PaymentResponseDto> {
    requirePaymentWrite(user);
    return this.createAggregate(dto.billId, dto.idempotencyKey, dto.payments, dto, user, true);
  }

  async findAll(
    query: PaymentQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaymentListResponseDto> {
    requirePaymentRead(user);
    const scope = resolvePaymentScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.PaymentWhereInput = {
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        status: query.status,
        paymentMethod: query.paymentMethod,
        billId: query.billId,
        businessDate:
          query.fromDate === undefined && query.toDate === undefined
            ? undefined
            : { gte: query.fromDate, lte: query.toDate },
        ...(query.referenceNumber?.trim()
          ? {
              referenceNumber: {
                contains: query.referenceNumber.trim(),
                mode: 'insensitive',
              },
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.payment.findMany({
          where,
          include: paymentInclude,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.payment.count({ where }),
      ]);
      return {
        data: data.map((payment) => this.toResponse(payment)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<PaymentResponseDto> {
    requirePaymentRead(user);
    return this.withPayment(id, user, (_tx, payment) =>
      Promise.resolve(this.toResponse(payment)),
    );
  }

  async updateStatus(
    id: string,
    dto: UpdatePaymentStatusDto,
    user: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    requirePaymentWrite(user);
    return this.withPayment(id, user, async (tx, payment) => {
      if (payment.status === dto.status) return this.toResponse(payment);
      if (
        payment.status !== PaymentStatus.PENDING &&
        payment.status !== PaymentStatus.PROCESSING
      ) {
        throw new ConflictException('Only pending or processing payments can change status');
      }
      if (
        dto.status !== PaymentStatus.PROCESSING &&
        dto.status !== PaymentStatus.SUCCESS &&
        dto.status !== PaymentStatus.FAILED &&
        dto.status !== PaymentStatus.CANCELLED
      ) {
        throw new BadRequestException('Unsupported payment status transition');
      }
      const successful = dto.status === PaymentStatus.SUCCESS;
      await tx.paymentTransaction.updateMany({
        where: { tenantId: payment.tenantId, paymentId: payment.id },
        data: { status: dto.status },
      });
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: dto.status,
          paidAmount: successful ? payment.amount : 0,
          paidByUserId: successful ? user.id : undefined,
          paidAt: successful ? new Date() : undefined,
          version: { increment: 1 },
        },
        include: paymentInclude,
      });
      await this.reconcileBill(tx, payment.billId);
      if (dto.status === PaymentStatus.FAILED) {
        this.events.publishFailed({
          type: 'PaymentFailed',
          tenantId: payment.tenantId,
          outletId: payment.outletId,
          paymentId: payment.id,
        });
      } else if (successful) {
        this.events.publishCompleted({
          type: 'PaymentCompleted',
          tenantId: payment.tenantId,
          outletId: payment.outletId,
          paymentId: payment.id,
        });
      }
      const refreshed = await tx.payment.findUniqueOrThrow({
        where: { id: updated.id },
        include: paymentInclude,
      });
      return this.toResponse(refreshed);
    });
  }

  async refund(
    id: string,
    dto: RefundPaymentDto,
    user: AuthenticatedUser,
  ): Promise<PaymentResponseDto> {
    requirePaymentWrite(user);
    return this.withPayment(id, user, async (tx, payment) => {
      const duplicate = await tx.paymentRefund.findUnique({
        where: {
          tenantId_paymentId_idempotencyKey: {
            tenantId: payment.tenantId,
            paymentId: payment.id,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });
      if (duplicate !== null) return this.toResponse(payment);
      if (payment.paidAmount <= 0) throw new ConflictException('Payment has no refundable amount');
      const available = payment.paidAmount - payment.refundedAmount;
      if (dto.refundAmount > available) {
        throw new ConflictException('Refund exceeds the unrefunded paid amount');
      }
      const refundCount = await tx.paymentRefund.count({
        where: { tenantId: payment.tenantId, paymentId: payment.id },
      });
      await tx.paymentRefund.create({
        data: {
          tenantId: payment.tenantId,
          paymentId: payment.id,
          refundNumber: `REF-${payment.paymentNumber}-${String(refundCount + 1).padStart(3, '0')}`,
          idempotencyKey: dto.idempotencyKey,
          refundAmount: dto.refundAmount,
          refundReason: dto.refundReason.trim(),
          status: RefundStatus.COMPLETED,
          refundedByUserId: user.id,
          refundedAt: new Date(),
        },
      });
      const refundedAmount = payment.refundedAmount + dto.refundAmount;
      const updated = await tx.payment.update({
        where: { id },
        data: {
          refundedAmount,
          status:
            refundedAmount === payment.paidAmount
              ? PaymentStatus.REFUNDED
              : payment.status,
          version: { increment: 1 },
        },
        include: paymentInclude,
      });
      await this.reconcileBill(tx, payment.billId);
      this.events.publishRefunded({
        type: 'PaymentRefunded',
        tenantId: payment.tenantId,
        outletId: payment.outletId,
        paymentId: payment.id,
      });
      const refreshed = await tx.payment.findUniqueOrThrow({
        where: { id: updated.id },
        include: paymentInclude,
      });
      return this.toResponse(refreshed);
    });
  }

  private async createAggregate(
    billId: string,
    idempotencyKey: string,
    tenders: PaymentTenderDto[],
    metadata: {
      paymentSource?: PaymentSource;
      deviceId?: string;
      terminalId?: string;
      shiftId?: string;
      notes?: string;
    },
    user: AuthenticatedUser,
    requireFullBalance = false,
  ): Promise<PaymentResponseDto> {
    const scope = resolvePaymentScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const bill = await tx.bill.findFirst({
        where: {
          id: billId,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
      });
      if (bill === null) throw new NotFoundException('Bill not found');
      await tx.$queryRaw`SELECT "id" FROM "bills" WHERE "id" = ${bill.id}::uuid FOR UPDATE`;
      const lockedBill = await tx.bill.findUniqueOrThrow({ where: { id: bill.id } });
      if (
        lockedBill.status === BillStatus.VOID ||
        lockedBill.status === BillStatus.REFUNDED
      ) {
        throw new ConflictException('Bill cannot accept payments');
      }
      const duplicate = await tx.payment.findUnique({
        where: {
          tenantId_outletId_idempotencyKey: {
            tenantId: lockedBill.tenantId,
            outletId: lockedBill.outletId,
            idempotencyKey,
          },
        },
        include: paymentInclude,
      });
      if (duplicate !== null) return this.toResponse(duplicate);
      const total = tenders.reduce((sum, tender) => sum + tender.amount, 0);
      if (requireFullBalance && total !== lockedBill.outstandingAmount) {
        throw new BadRequestException('Split payment total must equal the bill balance');
      }
      if (total > lockedBill.outstandingAmount) {
        throw new ConflictException('Payment exceeds the bill outstanding balance');
      }
      for (const tender of tenders) this.validateTender(tender);
      const businessDate = this.businessDate();
      const paymentNumber = await this.nextPaymentNumber(
        tx,
        lockedBill.tenantId,
        lockedBill.outletId,
        businessDate,
      );
      const first = tenders[0];
      const payment = await tx.payment.create({
        data: {
          tenantId: lockedBill.tenantId,
          outletId: lockedBill.outletId,
          billId: lockedBill.id,
          paymentNumber,
          idempotencyKey,
          paymentMethod: tenders.length === 1 ? first.paymentMethod : undefined,
          paymentSource: metadata.paymentSource ?? PaymentSource.POS,
          status: PaymentStatus.SUCCESS,
          amount: total,
          paidAmount: total,
          referenceNumber: tenders.length === 1 ? first.referenceNumber : undefined,
          gatewayTransactionId:
            tenders.length === 1 ? first.gatewayTransactionId : undefined,
          upiTransactionId: tenders.length === 1 ? first.upiTransactionId : undefined,
          payerName: tenders.length === 1 ? first.payerName : undefined,
          cardLast4: tenders.length === 1 ? first.cardLast4 : undefined,
          approvalCode: tenders.length === 1 ? first.approvalCode : undefined,
          cashReceived: tenders.length === 1 ? first.cashReceived : undefined,
          changeReturned:
            tenders.length === 1 && first.paymentMethod === PaymentMethod.CASH
              ? (first.cashReceived ?? 0) - first.amount
              : undefined,
          gatewayName: tenders.length === 1 ? first.gatewayName : undefined,
          gatewayResponse:
            tenders.length === 1
              ? (first.gatewayResponse as Prisma.InputJsonValue | undefined)
              : undefined,
          gatewayReference: tenders.length === 1 ? first.gatewayReference : undefined,
          deviceId: metadata.deviceId,
          terminalId: metadata.terminalId,
          shiftId: metadata.shiftId,
          businessDate,
          notes: metadata.notes?.trim(),
          createdByUserId: user.id,
          paidByUserId: user.id,
          paidAt: new Date(),
          transactions: {
            create: tenders.map((tender) => ({
              tenantId: lockedBill.tenantId,
              ...this.transactionData(tender),
              status: PaymentStatus.SUCCESS,
            })),
          },
        },
        include: paymentInclude,
      });
      await this.reconcileBill(tx, lockedBill.id);
      this.events.publishCreated({
        type: 'PaymentCreated',
        tenantId: payment.tenantId,
        outletId: payment.outletId,
        paymentId: payment.id,
      });
      this.events.publishCompleted({
        type: 'PaymentCompleted',
        tenantId: payment.tenantId,
        outletId: payment.outletId,
        paymentId: payment.id,
      });
      const refreshed = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: paymentInclude,
      });
      return this.toResponse(refreshed);
    });
  }

  private validateTender(tender: PaymentTenderDto): void {
    if (tender.paymentMethod === PaymentMethod.CASH) {
      if (tender.cashReceived === undefined || tender.cashReceived < tender.amount) {
        throw new BadRequestException('Cash received must cover the tender amount');
      }
    }
    if (tender.paymentMethod === PaymentMethod.CARD && tender.cardLast4 === undefined) {
      throw new BadRequestException('Card payments require cardLast4');
    }
    if (
      tender.paymentMethod === PaymentMethod.UPI &&
      tender.upiTransactionId === undefined &&
      tender.referenceNumber === undefined
    ) {
      throw new BadRequestException('UPI payments require a transaction or reference number');
    }
  }

  private transactionData(tender: PaymentTenderDto) {
    return {
      paymentMethod: tender.paymentMethod,
      amount: tender.amount,
      referenceNumber: tender.referenceNumber,
      gatewayTransactionId: tender.gatewayTransactionId,
      upiTransactionId: tender.upiTransactionId,
      payerName: tender.payerName,
      cardLast4: tender.cardLast4,
      approvalCode: tender.approvalCode,
      cashReceived: tender.cashReceived,
      changeReturned:
        tender.paymentMethod === PaymentMethod.CASH
          ? (tender.cashReceived ?? 0) - tender.amount
          : undefined,
      gatewayName: tender.gatewayName,
      gatewayResponse: tender.gatewayResponse as Prisma.InputJsonValue | undefined,
      gatewayReference: tender.gatewayReference,
    };
  }

  private async reconcileBill(tx: Prisma.TransactionClient, billId: string): Promise<void> {
    await tx.$queryRaw`SELECT "id" FROM "bills" WHERE "id" = ${billId}::uuid FOR UPDATE`;
    const bill = await tx.bill.findUniqueOrThrow({ where: { id: billId } });
    const payments = await tx.payment.aggregate({
      where: {
        tenantId: bill.tenantId,
        billId,
        status: { in: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED] },
      },
      _sum: { paidAmount: true, refundedAmount: true },
    });
    const paidAmount = payments._sum.paidAmount ?? 0;
    const refundedAmount = payments._sum.refundedAmount ?? 0;
    const { outstandingAmount, paymentStatus } = deriveBillPaymentState(
      bill.grandTotal,
      paidAmount,
      refundedAmount,
    );
    await tx.bill.update({
      where: { id: billId },
      data: {
        paidAmount,
        refundedAmount,
        outstandingAmount,
        paymentStatus,
        status:
          paymentStatus === BillPaymentStatus.REFUNDED
            ? BillStatus.REFUNDED
            : paymentStatus === BillPaymentStatus.PAID
              ? BillStatus.PAID
              : bill.status === BillStatus.PAID
                ? BillStatus.GENERATED
                : bill.status,
        version: { increment: 1 },
      },
    });
  }

  private businessDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private async nextPaymentNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    businessDate: Date,
  ): Promise<string> {
    const counter = await tx.paymentNumberCounter.upsert({
      where: { tenantId_outletId_businessDate: { tenantId, outletId, businessDate } },
      create: { tenantId, outletId, businessDate, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
      select: { lastNumber: true },
    });
    const date = businessDate.toISOString().slice(0, 10).replaceAll('-', '');
    return `PAY-${date}-${counter.lastNumber.toString().padStart(5, '0')}`;
  }

  private async withPayment<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (tx: Prisma.TransactionClient, payment: PaymentRecord) => Promise<T>,
  ): Promise<T> {
    const scope = resolvePaymentScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const payment = await tx.payment.findFirst({
        where: {
          id,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: paymentInclude,
      });
      if (payment === null) throw new NotFoundException('Payment not found');
      return operation(tx, payment);
    });
  }

  private toResponse(payment: PaymentRecord): PaymentResponseDto {
    return payment;
  }
}
