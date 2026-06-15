import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditResult, BillStatus, Prisma, ReceiptStatus, ReceiptType } from '@prisma/client';

import {
  applyDatabaseRequestContext,
  hasRole,
  PLATFORM_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { resolveOrderScope } from '../../orders/services/order-access.util';
import type { TaxReportQueryDto } from '../dto/tax-report.dto';
import { requireTaxReportView } from './tax-access.util';

const MAX_REPORT_DAYS = 370;

const taxReportBillInclude = {
  outlet: { select: { id: true, code: true, name: true } },
  taxes: { orderBy: [{ taxName: 'asc' }, { taxRate: 'asc' }] },
  receipts: {
    where: { status: { not: ReceiptStatus.VOID } },
    select: {
      id: true,
      receiptNumber: true,
      invoiceNumber: true,
      receiptType: true,
      status: true,
    },
    orderBy: { generatedAt: 'asc' },
  },
  taxCalculationSnapshots: {
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.BillInclude;

type TaxReportBill = Prisma.BillGetPayload<{ include: typeof taxReportBillInclude }>;

interface TaxReportContext {
  tenantId: string;
  outletId?: string;
  fromDate: Date;
  toDate: Date;
}

export interface TaxComponentRow {
  taxName: string;
  taxRate: number;
  taxAmount: number;
}

export interface TaxReportDetailRow {
  billId: string;
  billNumber: string;
  invoiceNumber: string | null;
  receiptNumbers: string[];
  businessDate: string;
  outletId: string;
  outletCode: string;
  outletName: string;
  currencyCode: string;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxMode: string | null;
  taxProfileId: string | null;
  snapshotId: string | null;
  components: TaxComponentRow[];
}

@Injectable()
export class TaxReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async summary(query: TaxReportQueryDto, actor: AuthenticatedUser) {
    const context = this.resolveContext(query, actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, context.tenantId);
      const bills = await tx.bill.findMany({
        where: this.billWhere(context),
        include: taxReportBillInclude,
        orderBy: [{ businessDate: 'asc' }, { billNumber: 'asc' }],
      });
      const rows = bills.map((bill) => this.detailRow(bill));
      const result = {
        tenantId: context.tenantId,
        outletId: context.outletId ?? null,
        fromDate: this.isoDate(context.fromDate),
        toDate: this.isoDate(context.toDate),
        ...this.aggregateRows(rows),
      };
      await this.auditReport(tx, actor, context, query, 'TAX_SUMMARY');
      return result;
    });
  }

  async detailed(query: TaxReportQueryDto, actor: AuthenticatedUser) {
    const context = this.resolveContext(query, actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, context.tenantId);
      const where = this.billWhere(context);
      const [total, bills] = await Promise.all([
        tx.bill.count({ where }),
        tx.bill.findMany({
          where,
          include: taxReportBillInclude,
          orderBy: [{ businessDate: 'asc' }, { billNumber: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
      ]);
      const data = bills.map((bill) => this.detailRow(bill));
      await this.auditReport(tx, actor, context, query, 'TAX_DETAILED');
      return {
        data,
        totals: this.aggregateRows(data),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  private resolveContext(query: TaxReportQueryDto, actor: AuthenticatedUser): TaxReportContext {
    requireTaxReportView(actor);
    if (hasRole(actor, PLATFORM_ADMIN_ROLE) && query.tenantId === undefined) {
      throw new BadRequestException('tenantId is required for platform tax reports');
    }
    const scope = resolveOrderScope(query.tenantId, query.outletId, actor, false);
    if (scope.tenantId === undefined) {
      throw new BadRequestException('tenantId is required for tax reports');
    }
    const today = this.utcDate(new Date());
    const fromDate = this.utcDate(query.businessDate ?? query.fromDate ?? today);
    const toDate = this.utcDate(query.businessDate ?? query.toDate ?? fromDate);
    if (fromDate > toDate) throw new BadRequestException('fromDate must not exceed toDate');
    const days = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
    if (days > MAX_REPORT_DAYS) {
      throw new BadRequestException(`Tax report range cannot exceed ${MAX_REPORT_DAYS} days`);
    }
    return { tenantId: scope.tenantId, outletId: scope.outletId, fromDate, toDate };
  }

  private billWhere(context: TaxReportContext): Prisma.BillWhereInput {
    return {
      tenantId: context.tenantId,
      ...(context.outletId === undefined ? {} : { outletId: context.outletId }),
      businessDate: { gte: context.fromDate, lte: context.toDate },
      status: { not: BillStatus.VOID },
    };
  }

  private detailRow(bill: TaxReportBill): TaxReportDetailRow {
    const snapshot = bill.taxCalculationSnapshots[0];
    const taxInvoiceReceipts = bill.receipts.filter(
      (receipt) => receipt.receiptType === ReceiptType.TAX_INVOICE,
    );
    const invoiceNumber =
      bill.invoiceNumber ??
      taxInvoiceReceipts.find((receipt) => receipt.invoiceNumber !== null)?.invoiceNumber ??
      null;
    return {
      billId: bill.id,
      billNumber: bill.billNumber,
      invoiceNumber,
      receiptNumbers: bill.receipts.map((receipt) => receipt.receiptNumber),
      businessDate: this.isoDate(bill.businessDate),
      outletId: bill.outletId,
      outletCode: bill.outlet.code,
      outletName: bill.outlet.name,
      currencyCode: bill.currencyCode,
      taxableAmount:
        snapshot?.taxableAmount ??
        Math.max(0, bill.subtotal - bill.discountAmount - bill.couponDiscountAmount),
      taxAmount: bill.taxes.reduce((sum, tax) => sum + tax.taxAmount, 0),
      totalAmount: bill.grandTotal,
      taxMode: snapshot?.taxMode ?? null,
      taxProfileId: snapshot?.taxProfileId ?? null,
      snapshotId: snapshot?.id ?? null,
      components: bill.taxes.map((tax) => ({
        taxName: tax.taxName,
        taxRate: tax.taxRate.toNumber(),
        taxAmount: tax.taxAmount,
      })),
    };
  }

  private aggregateRows(rows: TaxReportDetailRow[]) {
    const components = new Map<string, TaxComponentRow>();
    const outlets = new Map<
      string,
      {
        outletId: string;
        outletCode: string;
        outletName: string;
        invoiceCount: number;
        taxableAmount: number;
        taxAmount: number;
        totalAmount: number;
      }
    >();
    const currencies = new Map<
      string,
      {
        currencyCode: string;
        invoiceCount: number;
        taxableAmount: number;
        taxAmount: number;
        totalAmount: number;
      }
    >();

    for (const row of rows) {
      for (const component of row.components) {
        const key = `${component.taxName}:${component.taxRate}`;
        const current = components.get(key);
        components.set(key, {
          ...component,
          taxAmount: (current?.taxAmount ?? 0) + component.taxAmount,
        });
      }

      const outlet = outlets.get(row.outletId) ?? {
        outletId: row.outletId,
        outletCode: row.outletCode,
        outletName: row.outletName,
        invoiceCount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      };
      outlet.invoiceCount += 1;
      outlet.taxableAmount += row.taxableAmount;
      outlet.taxAmount += row.taxAmount;
      outlet.totalAmount += row.totalAmount;
      outlets.set(row.outletId, outlet);

      const currency = currencies.get(row.currencyCode) ?? {
        currencyCode: row.currencyCode,
        invoiceCount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      };
      currency.invoiceCount += 1;
      currency.taxableAmount += row.taxableAmount;
      currency.taxAmount += row.taxAmount;
      currency.totalAmount += row.totalAmount;
      currencies.set(row.currencyCode, currency);
    }

    return {
      invoiceCount: rows.length,
      taxInvoiceCount: rows.filter((row) => row.invoiceNumber !== null).length,
      taxableAmount: rows.reduce((sum, row) => sum + row.taxableAmount, 0),
      taxCollectedAmount: rows.reduce((sum, row) => sum + row.taxAmount, 0),
      totalAmount: rows.reduce((sum, row) => sum + row.totalAmount, 0),
      components: [...components.values()].sort(
        (left, right) => left.taxName.localeCompare(right.taxName) || left.taxRate - right.taxRate,
      ),
      outlets: [...outlets.values()].sort((left, right) =>
        left.outletCode.localeCompare(right.outletCode),
      ),
      currencies: [...currencies.values()].sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      ),
    };
  }

  private async auditReport(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    context: TaxReportContext,
    query: TaxReportQueryDto,
    reportType: string,
  ): Promise<void> {
    const audit = await tx.reportGenerationAudit.create({
      data: {
        tenantId: context.tenantId,
        outletId: context.outletId,
        reportType,
        filters: JSON.parse(JSON.stringify(query)) as Prisma.InputJsonValue,
        generatedByUserId: actor.id,
      },
    });
    await this.audit.append(tx, {
      tenantId: context.tenantId,
      outletId: context.outletId ?? null,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'tax.report.generated',
      targetType: 'ReportGenerationAudit',
      targetId: audit.id,
      result: AuditResult.SUCCESS,
      metadata: { reportType },
    });
  }

  private utcDate(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  private isoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
