import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BillPaymentStatus, BillStatus, Prisma, ReceiptStatus, ReceiptType } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { GenerateReceiptDto } from '../dto/generate-receipt.dto';
import type { PrintReceiptDto } from '../dto/print-receipt.dto';
import type { ReceiptQueryDto } from '../dto/receipt-query.dto';
import type { ReceiptListResponseDto, ReceiptResponseDto } from '../dto/receipt-response.dto';
import { InvoiceGeneratorService, type PrintableReceipt } from './invoice-generator.service';
import {
  requireReceiptRead,
  requireReceiptWrite,
  resolveReceiptScope,
} from './receipt-access.util';

const receiptInclude = {
  generatedBy: { select: { id: true, displayName: true } },
  printLogs: {
    include: { printedBy: { select: { id: true, displayName: true } } },
    orderBy: { printedAt: 'desc' },
  },
} satisfies Prisma.ReceiptInclude;

const billInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  taxes: { orderBy: [{ taxName: 'asc' }, { taxRate: 'asc' }] },
  order: { select: { orderNumber: true } },
  outlet: true,
  tenant: { select: { name: true, legalName: true } },
  payments: {
    where: { status: { in: ['SUCCESS', 'PARTIALLY_PAID'] } },
    include: { transactions: { where: { status: 'SUCCESS' }, orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.BillInclude;

type ReceiptRecord = Prisma.ReceiptGetPayload<{ include: typeof receiptInclude }>;

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
  ) {}

  async generate(dto: GenerateReceiptDto, user: AuthenticatedUser): Promise<ReceiptResponseDto> {
    requireReceiptWrite(user);
    const scope = resolveReceiptScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const bill = await tx.bill.findFirst({
        where: {
          id: dto.billId,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: billInclude,
      });
      if (bill === null) throw new NotFoundException('Bill not found');
      if (bill.status !== BillStatus.PAID || bill.paymentStatus !== BillPaymentStatus.PAID) {
        throw new ConflictException('Only fully paid bills can generate receipts or invoices');
      }
      if (
        dto.paymentId !== undefined &&
        !bill.payments.some((payment) => payment.id === dto.paymentId)
      ) {
        throw new NotFoundException('Payment not found for this bill');
      }
      if (
        dto.receiptType === ReceiptType.CUSTOMER_RECEIPT ||
        dto.receiptType === ReceiptType.TAX_INVOICE
      ) {
        const existing = await tx.receipt.findFirst({
          where: {
            tenantId: bill.tenantId,
            billId: bill.id,
            receiptType: dto.receiptType,
            status: { not: ReceiptStatus.VOID },
          },
          include: receiptInclude,
        });
        if (existing !== null) return this.toResponse(existing);
      }
      const generatedAt = new Date();
      const receiptNumber = await this.nextNumber(
        tx,
        'receipt',
        bill.tenantId,
        bill.outletId,
        generatedAt,
      );
      const invoiceNumber =
        dto.receiptType === ReceiptType.TAX_INVOICE
          ? await this.nextNumber(tx, 'invoice', bill.tenantId, bill.outletId, generatedAt)
          : null;
      const verificationCode = randomBytes(8).toString('hex').toUpperCase();
      const paymentReference =
        bill.payments
          .flatMap((payment) => payment.transactions)
          .find((transaction) => transaction.referenceNumber !== null)?.referenceNumber ??
        bill.payments[0]?.referenceNumber ??
        '';
      const qrPayload =
        `serveiq://receipt/${receiptNumber}` +
        `?bill=${encodeURIComponent(bill.billNumber)}` +
        `&payment=${encodeURIComponent(paymentReference)}` +
        `&verify=${verificationCode}`;
      const printablePayload = this.invoiceGenerator.build(bill, {
        receiptNumber,
        invoiceNumber,
        receiptType: dto.receiptType,
        verificationCode,
        qrPayload,
        generatedAt,
      });
      const created = await tx.receipt.create({
        data: {
          tenantId: bill.tenantId,
          outletId: bill.outletId,
          billId: bill.id,
          paymentId: dto.paymentId ?? (bill.payments.length === 1 ? bill.payments[0].id : null),
          receiptNumber,
          invoiceNumber,
          receiptType: dto.receiptType,
          printablePayload: printablePayload as unknown as Prisma.InputJsonValue,
          verificationCode,
          qrPayload,
          pdfUrl: `/receipts/__RECEIPT_ID__/pdf`,
          generatedByUserId: user.id,
          generatedAt,
        },
        include: receiptInclude,
      });
      const pdfUrl = `/receipts/${created.id}/pdf`;
      const updated = await tx.receipt.update({
        where: { id: created.id },
        data: { pdfUrl },
        include: receiptInclude,
      });
      if (invoiceNumber !== null) {
        await tx.bill.update({ where: { id: bill.id }, data: { invoiceNumber } });
      }
      return this.toResponse(updated);
    });
  }

  async findAll(query: ReceiptQueryDto, user: AuthenticatedUser): Promise<ReceiptListResponseDto> {
    requireReceiptRead(user);
    const scope = resolveReceiptScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.ReceiptWhereInput = {
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        billId: query.billId,
        receiptType: query.receiptType,
        status: query.status,
        ...(query.receiptNumber?.trim()
          ? { receiptNumber: { contains: query.receiptNumber.trim(), mode: 'insensitive' } }
          : {}),
        generatedAt:
          query.fromDate === undefined && query.toDate === undefined
            ? undefined
            : { gte: query.fromDate, lte: query.toDate },
      };
      const [data, total] = await Promise.all([
        tx.receipt.findMany({
          where,
          include: receiptInclude,
          orderBy: { generatedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.receipt.count({ where }),
      ]);
      return {
        data: data.map((receipt) => this.toResponse(receipt)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  findOne(id: string, user: AuthenticatedUser): Promise<ReceiptResponseDto> {
    requireReceiptRead(user);
    return this.withReceipt(id, user, (_tx, receipt) => Promise.resolve(this.toResponse(receipt)));
  }

  printable(id: string, user: AuthenticatedUser): Promise<PrintableReceipt> {
    requireReceiptRead(user);
    return this.withReceipt(id, user, (_tx, receipt) =>
      Promise.resolve(receipt.printablePayload as unknown as PrintableReceipt),
    );
  }

  print(id: string, dto: PrintReceiptDto, user: AuthenticatedUser): Promise<ReceiptResponseDto> {
    return this.recordPrint(id, dto, user, false);
  }

  reprint(id: string, dto: PrintReceiptDto, user: AuthenticatedUser): Promise<ReceiptResponseDto> {
    return this.recordPrint(id, dto, user, true);
  }

  private async recordPrint(
    id: string,
    dto: PrintReceiptDto,
    user: AuthenticatedUser,
    isReprint: boolean,
  ): Promise<ReceiptResponseDto> {
    requireReceiptWrite(user);
    return this.withReceipt(id, user, async (tx, receipt) => {
      if (receipt.status === ReceiptStatus.VOID) {
        throw new ConflictException('Void receipts cannot be printed');
      }
      if (isReprint && receipt.printCount === 0) {
        throw new ConflictException('Receipt must be printed before it can be reprinted');
      }
      const printedAt = new Date();
      await tx.receiptPrintLog.create({
        data: {
          tenantId: receipt.tenantId,
          outletId: receipt.outletId,
          receiptId: receipt.id,
          printedByUserId: user.id,
          printerName: dto.printerName.trim(),
          printerType: dto.printerType,
          copies: dto.copies,
          isReprint,
          printedAt,
        },
      });
      const updated = await tx.receipt.update({
        where: { id },
        data: {
          status: isReprint ? ReceiptStatus.REPRINTED : ReceiptStatus.PRINTED,
          printCount: { increment: dto.copies },
          lastPrintedAt: printedAt,
          version: { increment: 1 },
        },
        include: receiptInclude,
      });
      return this.toResponse(updated);
    });
  }

  private async nextNumber(
    tx: Prisma.TransactionClient,
    kind: 'receipt' | 'invoice',
    tenantId: string,
    outletId: string,
    now: Date,
  ): Promise<string> {
    const businessDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const counter =
      kind === 'receipt'
        ? await tx.receiptNumberCounter.upsert({
            where: { tenantId_outletId_businessDate: { tenantId, outletId, businessDate } },
            create: { tenantId, outletId, businessDate, lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
            select: { lastNumber: true },
          })
        : await tx.invoiceNumberCounter.upsert({
            where: { tenantId_outletId_businessDate: { tenantId, outletId, businessDate } },
            create: { tenantId, outletId, businessDate, lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
            select: { lastNumber: true },
          });
    const prefix = kind === 'receipt' ? 'REC' : 'INV';
    return `${prefix}-${businessDate.toISOString().slice(0, 10).replaceAll('-', '')}-${counter.lastNumber.toString().padStart(5, '0')}`;
  }

  private async withReceipt<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (tx: Prisma.TransactionClient, receipt: ReceiptRecord) => Promise<T>,
  ): Promise<T> {
    const scope = resolveReceiptScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const receipt = await tx.receipt.findFirst({
        where: {
          id,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: receiptInclude,
      });
      if (receipt === null) throw new NotFoundException('Receipt not found');
      return operation(tx, receipt);
    });
  }

  private toResponse(receipt: ReceiptRecord): ReceiptResponseDto {
    return receipt;
  }
}
