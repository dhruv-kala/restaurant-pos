import { Injectable } from '@nestjs/common';
import { BillStatus, OrderStatus, PaymentStatus, Prisma, ReportExportFormat } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { ExportReportDto } from '../dto/export-report.dto';
import type { ReportFilterDto } from '../dto/report-filter.dto';
import {
  auditData,
  dateRange,
  GENERAL_REPORT_ROLES,
  INVENTORY_REPORT_ROLES,
  KITCHEN_REPORT_ROLES,
  MANAGEMENT_REPORT_ROLES,
  ownEmployeeId,
  reportContext,
  STAFF_REPORT_ROLES,
  type ReportContext,
} from '../models/report-context.model';

@Injectable()
export class ReportQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async salesSummary(filter: ReportFilterDto, user: AuthenticatedUser) {
    return this.run('SALES_SUMMARY', filter, user, GENERAL_REPORT_ROLES, async (tx, context) => {
      const bills = await tx.bill.findMany({
        where: this.billWhere(context),
        select: {
          orderId: true,
          subtotal: true,
          discountAmount: true,
          couponDiscountAmount: true,
          taxAmount: true,
          grandTotal: true,
          paidAmount: true,
          refundedAmount: true,
        },
      });
      const totalOrders = new Set(bills.map((bill) => bill.orderId)).size;
      const grossSales = sum(bills, (bill) => bill.subtotal);
      const discounts = sum(bills, (bill) => bill.discountAmount + bill.couponDiscountAmount);
      const taxes = sum(bills, (bill) => bill.taxAmount);
      const refunds = sum(bills, (bill) => bill.refundedAmount);
      const totalSales = sum(bills, (bill) => bill.paidAmount - bill.refundedAmount);
      return {
        totalSales,
        grossSales,
        netSales: grossSales - discounts,
        totalOrders,
        averageOrderValue: totalOrders ? Math.round(totalSales / totalOrders) : 0,
        discounts,
        taxes,
        refunds,
      };
    });
  }

  async salesTrend(
    filter: ReportFilterDto,
    user: AuthenticatedUser,
    period: 'DAY' | 'MONTH' | 'YEAR',
  ) {
    return this.run(`SALES_${period}`, filter, user, GENERAL_REPORT_ROLES, async (tx, context) => {
      const bills = await tx.bill.findMany({
        where: this.billWhere(context),
        select: {
          businessDate: true,
          orderId: true,
          paidAmount: true,
          refundedAmount: true,
          taxAmount: true,
          discountAmount: true,
        },
        orderBy: { businessDate: 'asc' },
      });
      const groups = new Map<string, typeof bills>();
      for (const bill of bills) {
        const iso = bill.businessDate.toISOString();
        const key =
          period === 'YEAR'
            ? iso.slice(0, 4)
            : period === 'MONTH'
              ? iso.slice(0, 7)
              : iso.slice(0, 10);
        groups.set(key, [...(groups.get(key) ?? []), bill]);
      }
      return [...groups.entries()].map(([label, rows]) => ({
        label,
        sales: sum(rows, (row) => row.paidAmount - row.refundedAmount),
        orders: new Set(rows.map((row) => row.orderId)).size,
        taxes: sum(rows, (row) => row.taxAmount),
        discounts: sum(rows, (row) => row.discountAmount),
      }));
    });
  }

  async itemSales(filter: ReportFilterDto, user: AuthenticatedUser) {
    return this.run('ITEM_SALES', filter, user, GENERAL_REPORT_ROLES, async (tx, context) => {
      const items = await tx.billItem.findMany({
        where: { bill: this.billWhere(context) },
        select: {
          menuItemId: true,
          name: true,
          quantity: true,
          lineTotal: true,
          orderItem: {
            select: {
              menuItem: {
                select: {
                  costPrice: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      });
      const groups = new Map<
        string,
        { name: string; category: string; quantity: number; revenue: number; cost: number }
      >();
      for (const item of items) {
        const current = groups.get(item.menuItemId) ?? {
          name: item.name,
          category: item.orderItem.menuItem.category.name,
          quantity: 0,
          revenue: 0,
          cost: 0,
        };
        current.quantity += item.quantity;
        current.revenue += item.lineTotal;
        current.cost += (item.orderItem.menuItem.costPrice ?? 0) * item.quantity;
        groups.set(item.menuItemId, current);
      }
      return [...groups.entries()].map(([itemId, item]) => {
        const profit = item.revenue - item.cost;
        return {
          itemId,
          itemName: item.name,
          category: item.category,
          quantitySold: item.quantity,
          revenue: item.revenue,
          cost: item.cost,
          profit,
          marginPercentage: item.revenue ? Number(((profit / item.revenue) * 100).toFixed(2)) : 0,
        };
      });
    });
  }

  async categorySales(filter: ReportFilterDto, user: AuthenticatedUser) {
    const items = await this.itemSales({ ...filter, page: 1, limit: 100 }, user);
    const groups = new Map<string, { sales: number; quantity: number; items: Set<string> }>();
    for (const item of items) {
      const current = groups.get(item.category) ?? {
        sales: 0,
        quantity: 0,
        items: new Set<string>(),
      };
      current.sales += item.revenue;
      current.quantity += item.quantitySold;
      current.items.add(item.itemId);
      groups.set(item.category, current);
    }
    return [...groups.entries()].map(([category, row]) => ({
      category,
      sales: row.sales,
      orders: row.items.size,
      quantity: row.quantity,
    }));
  }

  async gst(filter: ReportFilterDto, user: AuthenticatedUser, detailed: boolean) {
    return this.run(
      detailed ? 'GST_DETAILED' : 'GST_SUMMARY',
      filter,
      user,
      GENERAL_REPORT_ROLES,
      async (tx, context) => {
        const bills = await tx.bill.findMany({
          where: this.billWhere(context),
          select: {
            id: true,
            billNumber: true,
            businessDate: true,
            subtotal: true,
            discountAmount: true,
            taxes: { select: { taxName: true, taxRate: true, taxAmount: true } },
          },
          skip: detailed ? (filter.page - 1) * filter.limit : undefined,
          take: detailed ? filter.limit : undefined,
        });
        const rows = bills.map((bill) => ({
          billId: bill.id,
          billNumber: bill.billNumber,
          businessDate: bill.businessDate,
          taxableAmount: bill.subtotal - bill.discountAmount,
          cgst: taxAmount(bill.taxes, 'CGST'),
          sgst: taxAmount(bill.taxes, 'SGST'),
          igst: taxAmount(bill.taxes, 'IGST'),
          taxAmount: sum(bill.taxes, (tax) => tax.taxAmount),
        }));
        if (detailed) return rows;
        return {
          cgst: sum(rows, (row) => row.cgst),
          sgst: sum(rows, (row) => row.sgst),
          igst: sum(rows, (row) => row.igst),
          taxableAmount: sum(rows, (row) => row.taxableAmount),
          taxAmount: sum(rows, (row) => row.taxAmount),
          invoiceCount: rows.length,
        };
      },
    );
  }

  async payments(
    filter: ReportFilterDto,
    user: AuthenticatedUser,
    mode: 'SUMMARY' | 'METHODS' | 'REFUNDS',
  ) {
    return this.run(`PAYMENTS_${mode}`, filter, user, GENERAL_REPORT_ROLES, async (tx, context) => {
      const payments = await tx.payment.findMany({
        where: {
          ...(context.tenantId ? { tenantId: context.tenantId } : {}),
          ...(context.outletId ? { outletId: context.outletId } : {}),
          businessDate: dateRange(context),
          ...(filter.paymentMethod
            ? { transactions: { some: { paymentMethod: filter.paymentMethod } } }
            : {}),
        },
        include: { transactions: true, refunds: true },
      });
      if (mode === 'REFUNDS') {
        return payments.flatMap((payment) =>
          payment.refunds.map((refund) => ({
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            businessDate: payment.businessDate,
            amount: refund.refundAmount,
            status: refund.status,
            reason: refund.refundReason,
          })),
        );
      }
      const methods: Record<string, number> = {};
      for (const payment of payments.filter((item) => item.status !== PaymentStatus.FAILED)) {
        for (const transaction of payment.transactions) {
          methods[transaction.paymentMethod] =
            (methods[transaction.paymentMethod] ?? 0) + transaction.amount;
        }
      }
      const refunds = sum(payments, (payment) => payment.refundedAmount);
      const failedPayments = payments.filter(
        (payment) => payment.status === PaymentStatus.FAILED,
      ).length;
      return mode === 'METHODS'
        ? Object.entries(methods).map(([paymentMethod, amount]) => ({ paymentMethod, amount }))
        : {
            cash: methods.CASH ?? 0,
            upi: methods.UPI ?? 0,
            card: methods.CARD ?? 0,
            wallet: methods.WALLET ?? 0,
            giftCard: methods.GIFT_CARD ?? 0,
            bankTransfer: methods.BANK_TRANSFER ?? 0,
            refunds,
            failedPayments,
            totalCollected:
              Object.values(methods).reduce((total, amount) => total + amount, 0) - refunds,
          };
    });
  }

  async inventory(
    filter: ReportFilterDto,
    user: AuthenticatedUser,
    mode: 'VALUE' | 'CONSUMPTION' | 'WASTAGE' | 'LOW_STOCK',
  ) {
    return this.run(
      `INVENTORY_${mode}`,
      filter,
      user,
      INVENTORY_REPORT_ROLES,
      async (tx, context) => {
        if (mode === 'VALUE') {
          const stocks = await tx.inventoryStock.findMany({
            where: {
              ...(context.tenantId ? { tenantId: context.tenantId } : {}),
              ...(context.outletId ? { outletId: context.outletId } : {}),
            },
            include: { ingredient: { select: { id: true, name: true, costPrice: true } } },
          });
          const items = stocks.map((stock) => ({
            ingredientId: stock.ingredientId,
            ingredient: stock.ingredient.name,
            quantity: Number(stock.availableQuantity),
            value: Math.round(Number(stock.availableQuantity) * stock.ingredient.costPrice),
          }));
          return { currentInventoryValue: sum(items, (item) => item.value), items };
        }
        if (mode === 'LOW_STOCK') {
          const alerts = await tx.inventoryAlert.findMany({
            where: {
              ...(context.tenantId ? { tenantId: context.tenantId } : {}),
              ...(context.outletId ? { outletId: context.outletId } : {}),
              isResolved: false,
            },
            include: { ingredient: { select: { id: true, name: true } } },
            take: filter.limit,
          });
          return { lowStockItems: alerts.length, items: alerts };
        }
        if (mode === 'CONSUMPTION') {
          const rows = await tx.inventoryConsumption.findMany({
            where: {
              ...(context.tenantId ? { tenantId: context.tenantId } : {}),
              ...(context.outletId ? { outletId: context.outletId } : {}),
              businessDate: dateRange(context),
            },
            include: { ingredient: { select: { name: true } } },
            take: filter.limit,
          });
          return { consumptionCost: sum(rows, (row) => row.costAtConsumption), items: rows };
        }
        const rows = await tx.inventoryWastage.findMany({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { outletId: context.outletId } : {}),
            businessDate: dateRange(context),
          },
          include: { ingredient: { select: { name: true } } },
          take: filter.limit,
        });
        return { wastageCost: sum(rows, (row) => row.costAtWastage), items: rows };
      },
    );
  }

  async customers(
    filter: ReportFilterDto,
    user: AuthenticatedUser,
    mode: 'TOP' | 'NEW' | 'REPEAT',
  ) {
    return this.run(
      `CUSTOMERS_${mode}`,
      filter,
      user,
      MANAGEMENT_REPORT_ROLES,
      async (tx, context) => {
        const visits = await tx.customerVisit.findMany({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { outletId: context.outletId } : {}),
            businessDate: dateRange(context),
            ...(filter.customerId ? { customerId: filter.customerId } : {}),
          },
          include: { customer: { select: { id: true, displayName: true } } },
        });
        const groups = new Map<
          string,
          { customer: string; orders: Set<string>; spend: number; visits: number }
        >();
        for (const visit of visits) {
          const current = groups.get(visit.customerId) ?? {
            customer: visit.customer.displayName,
            orders: new Set<string>(),
            spend: 0,
            visits: 0,
          };
          if (visit.orderId) current.orders.add(visit.orderId);
          current.spend += visit.totalSpend;
          current.visits += 1;
          groups.set(visit.customerId, current);
        }
        let rows = [...groups.entries()].map(([customerId, row]) => ({
          customerId,
          customer: row.customer,
          orders: row.orders.size,
          spend: row.spend,
          visits: row.visits,
          averageSpend: row.visits ? Math.round(row.spend / row.visits) : 0,
        }));
        if (mode === 'REPEAT') rows = rows.filter((row) => row.visits > 1);
        if (mode === 'NEW') rows = rows.filter((row) => row.visits === 1);
        return rows.sort((left, right) => right.spend - left.spend).slice(0, filter.limit);
      },
    );
  }

  async outletPerformance(filter: ReportFilterDto, user: AuthenticatedUser) {
    return this.run(
      'OUTLET_PERFORMANCE',
      filter,
      user,
      MANAGEMENT_REPORT_ROLES,
      async (tx, context) => {
        const outlets = await tx.outlet.findMany({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { id: context.outletId } : {}),
            deletedAt: null,
          },
          select: { id: true, name: true },
        });
        const results = [];
        for (const outlet of outlets) {
          const [bills, visits, stocks] = await Promise.all([
            tx.bill.findMany({
              where: { ...this.billWhere(context), outletId: outlet.id },
              select: {
                orderId: true,
                paidAmount: true,
                refundedAmount: true,
                items: {
                  select: {
                    quantity: true,
                    orderItem: { select: { menuItem: { select: { costPrice: true } } } },
                  },
                },
              },
            }),
            tx.customerVisit.count({
              where: { outletId: outlet.id, businessDate: dateRange(context) },
            }),
            tx.inventoryStock.findMany({
              where: { outletId: outlet.id },
              include: { ingredient: { select: { costPrice: true } } },
            }),
          ]);
          const sales = sum(bills, (bill) => bill.paidAmount - bill.refundedAmount);
          const cost = bills.reduce(
            (total, bill) =>
              total +
              bill.items.reduce(
                (subtotal, item) =>
                  subtotal + item.quantity * (item.orderItem.menuItem.costPrice ?? 0),
                0,
              ),
            0,
          );
          results.push({
            outletId: outlet.id,
            outlet: outlet.name,
            sales,
            orders: new Set(bills.map((bill) => bill.orderId)).size,
            customers: visits,
            profit: sales - cost,
            inventoryValue: Math.round(
              stocks.reduce(
                (total, stock) =>
                  total + Number(stock.availableQuantity) * stock.ingredient.costPrice,
                0,
              ),
            ),
          });
        }
        return results;
      },
    );
  }

  async kitchen(filter: ReportFilterDto, user: AuthenticatedUser) {
    return this.run(
      'KITCHEN_PERFORMANCE',
      filter,
      user,
      KITCHEN_REPORT_ROLES,
      async (tx, context) => {
        const items = await tx.orderItem.findMany({
          where: {
            order: {
              ...(context.tenantId ? { tenantId: context.tenantId } : {}),
              ...(context.outletId ? { outletId: context.outletId } : {}),
              businessDate: dateRange(context),
            },
            deletedAt: null,
          },
          select: { actualPrepMinutes: true, estimatedPrepMinutes: true, readyAt: true },
        });
        const prepared = items.filter((item) => item.readyAt !== null);
        const delayedOrders = prepared.filter(
          (item) => (item.actualPrepMinutes ?? 0) > item.estimatedPrepMinutes,
        ).length;
        const averagePrepTime = prepared.length
          ? Number(
              (
                prepared.reduce((total, item) => total + (item.actualPrepMinutes ?? 0), 0) /
                prepared.length
              ).toFixed(2),
            )
          : 0;
        return {
          ordersPrepared: prepared.length,
          averagePrepTime,
          delayedOrders,
          kitchenEfficiencyPercentage: prepared.length
            ? Number((((prepared.length - delayedOrders) / prepared.length) * 100).toFixed(2))
            : 0,
        };
      },
    );
  }

  async staff(filter: ReportFilterDto, user: AuthenticatedUser) {
    const employeeId = ownEmployeeId(user, filter.employeeId);
    return this.run(
      'STAFF_PERFORMANCE',
      { ...filter, employeeId },
      user,
      STAFF_REPORT_ROLES,
      async (tx, context) => {
        const orders = await tx.order.findMany({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { outletId: context.outletId } : {}),
            businessDate: dateRange(context),
            ...(employeeId ? { waiterId: employeeId } : {}),
          },
          select: { waiterId: true, grandTotal: true },
        });
        const payments = await tx.payment.findMany({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { outletId: context.outletId } : {}),
            businessDate: dateRange(context),
            ...(employeeId ? { createdByUserId: employeeId } : {}),
            status: {
              in: [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_PAID, PaymentStatus.REFUNDED],
            },
          },
          select: { createdByUserId: true, paidAmount: true, refundedAmount: true },
        });
        const ids = [
          ...new Set(
            [
              ...orders.map((row) => row.waiterId),
              ...payments.map((row) => row.createdByUserId),
            ].filter((id): id is string => id !== null),
          ),
        ];
        const users = await tx.userAccount.findMany({
          where: { id: { in: ids } },
          select: { id: true, displayName: true },
        });
        const names = new Map(users.map((item) => [item.id, item.displayName]));
        return ids.map((id) => {
          const employeeOrders = orders.filter((order) => order.waiterId === id);
          const waiterSales = sum(employeeOrders, (order) => order.grandTotal);
          return {
            employeeId: id,
            employee: names.get(id) ?? id,
            waiterSales,
            cashierCollections: sum(
              payments.filter((payment) => payment.createdByUserId === id),
              (payment) => payment.paidAmount - payment.refundedAmount,
            ),
            ordersHandled: employeeOrders.length,
            averageTicketSize: employeeOrders.length
              ? Math.round(waiterSales / employeeOrders.length)
              : 0,
          };
        });
      },
    );
  }

  async platform(filter: ReportFilterDto, user: AuthenticatedUser) {
    return this.run('PLATFORM_SUMMARY', filter, user, ['SUPER_ADMIN'], async (tx, context) => {
      const [tenants, outlets, bills] = await Promise.all([
        tx.tenant.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
        tx.outlet.count({ where: { deletedAt: null } }),
        tx.bill.findMany({
          where: { businessDate: dateRange(context), status: { not: BillStatus.VOID } },
          select: { tenantId: true, orderId: true, paidAmount: true, refundedAmount: true },
        }),
      ]);
      const tenantNames = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));
      const grouped = new Map<string, { revenue: number; orders: Set<string> }>();
      for (const bill of bills) {
        const row = grouped.get(bill.tenantId) ?? { revenue: 0, orders: new Set<string>() };
        row.revenue += bill.paidAmount - bill.refundedAmount;
        row.orders.add(bill.orderId);
        grouped.set(bill.tenantId, row);
      }
      return {
        totalTenants: tenants.length,
        totalOutlets: outlets,
        totalRevenue: sum(bills, (bill) => bill.paidAmount - bill.refundedAmount),
        totalOrders: new Set(bills.map((bill) => bill.orderId)).size,
        topTenants: [...grouped.entries()]
          .map(([tenantId, row]) => ({
            tenantId,
            tenant: tenantNames.get(tenantId),
            revenue: row.revenue,
            orders: row.orders.size,
          }))
          .sort((left, right) => right.revenue - left.revenue)
          .slice(0, 10),
      };
    });
  }

  async dashboard(filter: ReportFilterDto, user: AuthenticatedUser) {
    return this.run('DASHBOARD', filter, user, GENERAL_REPORT_ROLES, async (tx, context) => {
      const [bills, visits, pendingOrders, stocks, lowStockAlerts, billItems] = await Promise.all([
        tx.bill.findMany({
          where: this.billWhere(context),
          select: {
            orderId: true,
            paidAmount: true,
            refundedAmount: true,
          },
        }),
        tx.customerVisit.findMany({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { outletId: context.outletId } : {}),
            businessDate: dateRange(context),
          },
          select: { customerId: true },
        }),
        tx.order.count({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { outletId: context.outletId } : {}),
            businessDate: dateRange(context),
            status: {
              in: [
                OrderStatus.PENDING,
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.SERVED,
              ],
            },
          },
        }),
        tx.inventoryStock.findMany({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { outletId: context.outletId } : {}),
          },
          select: {
            availableQuantity: true,
            ingredient: { select: { costPrice: true } },
          },
        }),
        tx.inventoryAlert.count({
          where: {
            ...(context.tenantId ? { tenantId: context.tenantId } : {}),
            ...(context.outletId ? { outletId: context.outletId } : {}),
            isResolved: false,
          },
        }),
        tx.billItem.findMany({
          where: { bill: this.billWhere(context) },
          select: { menuItemId: true, name: true, quantity: true, lineTotal: true },
        }),
      ]);
      const topItems = new Map<string, { itemName: string; quantity: number; revenue: number }>();
      for (const item of billItems) {
        const current = topItems.get(item.menuItemId) ?? {
          itemName: item.name,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity;
        current.revenue += item.lineTotal;
        topItems.set(item.menuItemId, current);
      }
      const todaySales = sum(bills, (bill) => bill.paidAmount - bill.refundedAmount);
      const todayOrders = new Set(bills.map((bill) => bill.orderId)).size;
      return {
        todaySales,
        todayOrders,
        todayCustomers: new Set(visits.map((visit) => visit.customerId)).size,
        averageOrderValue: todayOrders ? Math.round(todaySales / todayOrders) : 0,
        topSellingItems: [...topItems.entries()]
          .map(([itemId, item]) => ({ itemId, ...item }))
          .sort((left, right) => right.quantity - left.quantity)
          .slice(0, 5),
        lowStockAlerts,
        pendingOrders,
        inventoryValue: Math.round(
          stocks.reduce(
            (total, stock) => total + Number(stock.availableQuantity) * stock.ingredient.costPrice,
            0,
          ),
        ),
      };
    });
  }

  async export(dto: ExportReportDto, user: AuthenticatedUser) {
    const context = reportContext(dto.filters, user, MANAGEMENT_REPORT_ROLES);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, context.tenantId);
      const audit = await tx.reportGenerationAudit.create({
        data: auditData(dto.reportType, dto.filters, context, user, dto.format),
      });
      await this.audit.append(tx, {
        tenantId: context.tenantId ?? null,
        outletId: context.outletId ?? null,
        actorUserId: user.id,
        actorRoles: user.roles,
        action: 'reports.export.requested',
        targetType: 'ReportGenerationAudit',
        targetId: audit.id,
        metadata: { reportType: dto.reportType, format: dto.format },
      });
      return {
        auditId: audit.id,
        reportType: dto.reportType,
        format: dto.format,
        status: 'FOUNDATION_READY',
        requestedAt: audit.generatedAt,
        message: 'Export request audited; renderer and storage delivery are deferred.',
      };
    });
  }

  private async run<T>(
    reportType: string,
    filter: ReportFilterDto,
    user: AuthenticatedUser,
    roles: string[],
    query: (tx: Prisma.TransactionClient, context: ReportContext) => Promise<T>,
    exportFormat?: ReportExportFormat,
  ): Promise<T> {
    const context = reportContext(filter, user, roles);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, context.tenantId);
      const result = await query(tx, context);
      const audit = await tx.reportGenerationAudit.create({
        data: auditData(reportType, filter, context, user, exportFormat),
      });
      await this.audit.append(tx, {
        tenantId: context.tenantId ?? null,
        outletId: context.outletId ?? null,
        actorUserId: user.id,
        actorRoles: user.roles,
        action: 'reports.generated',
        targetType: 'ReportGenerationAudit',
        targetId: audit.id,
        metadata: { reportType, exportFormat: exportFormat ?? null },
      });
      return result;
    });
  }

  private billWhere(context: ReportContext): Prisma.BillWhereInput {
    return {
      ...(context.tenantId ? { tenantId: context.tenantId } : {}),
      ...(context.outletId ? { outletId: context.outletId } : {}),
      businessDate: dateRange(context),
      status: { not: BillStatus.VOID },
    };
  }
}

function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}

function taxAmount(taxes: Array<{ taxName: string; taxAmount: number }>, name: string): number {
  return taxes
    .filter((tax) => tax.taxName.toUpperCase().includes(name))
    .reduce((total, tax) => total + tax.taxAmount, 0);
}
