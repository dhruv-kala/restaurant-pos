import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { EmployeeQueryDto } from '../dto/employee-query.dto';
import { EmployeeEvent } from '../enums/employee-events';
import {
  isEmployeeSelfOnly,
  requireEmployeeRead,
  resolveEmployeeScope,
} from './employee-access.util';
import { EmployeeEventsService } from './employee-events.service';

@Injectable()
export class PerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EmployeeEventsService,
  ) {}

  async employee(id: string, query: EmployeeQueryDto, user: AuthenticatedUser) {
    requireEmployeeRead(user);
    const scope = resolveEmployeeScope(query.tenantId, query.outletId, user);
    const dates = this.dates(query);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const employee = await tx.employeeProfile.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
          ...(isEmployeeSelfOnly(user) ? { userId: user.id } : {}),
        },
        include: { role: true, outlet: true },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      const records = [];
      for (const date of dates) records.push(await this.refreshDay(tx, employee, date));
      return records;
    });
  }

  async report(query: EmployeeQueryDto, user: AuthenticatedUser) {
    requireEmployeeRead(user);
    const scope = resolveEmployeeScope(query.tenantId, query.outletId, user);
    const date = this.dates(query)[0];
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const employees = await tx.employeeProfile.findMany({
        where: {
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
          ...(isEmployeeSelfOnly(user) ? { userId: user.id } : {}),
          ...(query.department ? { department: query.department } : {}),
        },
        include: { role: true, outlet: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });
      const data = [];
      for (const employee of employees) {
        data.push(await this.refreshDay(tx, employee, date));
      }
      return data.sort((left, right) => right.salesAmount - left.salesAmount);
    });
  }

  async refreshByUserInTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string | null | undefined,
    businessDate: Date,
  ) {
    if (!userId) return;
    const employee = await tx.employeeProfile.findFirst({
      where: { tenantId, userId, deletedAt: null },
      include: { role: true, outlet: true },
    });
    if (employee) await this.refreshDay(tx, employee, businessDate);
  }

  private async refreshDay(
    tx: Prisma.TransactionClient,
    employee: Prisma.EmployeeProfileGetPayload<{
      include: { role: true; outlet: true };
    }>,
    businessDate: Date,
  ) {
    const manager = employee.department === 'MANAGEMENT';
    const orderWhere: Prisma.OrderWhereInput = {
      tenantId: employee.tenantId,
      outletId: employee.outletId,
      businessDate,
      status: { not: OrderStatus.CANCELLED },
      ...(!manager ? { waiterId: employee.userId } : {}),
    };
    const paymentWhere: Prisma.PaymentWhereInput = {
      tenantId: employee.tenantId,
      outletId: employee.outletId,
      businessDate,
      status: {
        in: [
          PaymentStatus.SUCCESS,
          PaymentStatus.PARTIALLY_PAID,
          PaymentStatus.REFUNDED,
        ],
      },
      ...(!manager ? { createdByUserId: employee.userId } : {}),
    };
    const kitchenWhere: Prisma.OrderItemWhereInput = {
      tenantId: employee.tenantId,
      order: { outletId: employee.outletId, businessDate },
      deletedAt: null,
      readyAt: { not: null },
      ...(!manager ? { readyByUserId: employee.userId } : {}),
    };
    const [orders, payments, billsProcessed, refundsProcessed, kitchenItems] =
      await Promise.all([
        tx.order.findMany({
          where: orderWhere,
          select: {
            id: true,
            customerId: true,
            grandTotal: true,
            discountAmount: true,
            items: { where: { deletedAt: null }, select: { quantity: true } },
          },
        }),
        tx.payment.findMany({
          where: paymentWhere,
          select: { paidAmount: true, refundedAmount: true },
        }),
        tx.bill.count({
          where: {
            tenantId: employee.tenantId,
            outletId: employee.outletId,
            businessDate,
            ...(manager ? {} : { generatedByUserId: employee.userId }),
          },
        }),
        tx.paymentRefund.count({
          where: {
            tenantId: employee.tenantId,
            refundedByUserId: employee.userId,
            payment: { businessDate, outletId: employee.outletId },
          },
        }),
        tx.orderItem.findMany({
          where: kitchenWhere,
          select: { actualPrepMinutes: true, estimatedPrepMinutes: true, quantity: true },
        }),
      ]);
    const waiterSales = sum(orders, (order) => order.grandTotal);
    const paymentsCollected = sum(
      payments,
      (payment) => payment.paidAmount - payment.refundedAmount,
    );
    const salesAmount = manager
      ? paymentsCollected
      : employee.department === 'CASHIER'
        ? paymentsCollected
        : waiterSales;
    const itemsProcessed =
      sum(orders, (order) => sum(order.items, (item) => item.quantity)) +
      sum(kitchenItems, (item) => item.quantity);
    const prepValues = kitchenItems
      .map((item) => item.actualPrepMinutes)
      .filter((value): value is number => value !== null);
    const averagePrepMinutes = prepValues.length
      ? prepValues.reduce((total, value) => total + value, 0) / prepValues.length
      : 0;
    const data = {
      outletId: employee.outletId,
      ordersHandled: orders.length,
      salesAmount,
      customersServed: new Set(
        orders.flatMap((order) => (order.customerId ? [order.customerId] : [])),
      ).size,
      averageTicketSize: orders.length ? Math.round(waiterSales / orders.length) : 0,
      itemsProcessed,
      billsProcessed,
      paymentsCollected,
      tipsCollected: 0,
      discountsGiven: sum(orders, (order) => order.discountAmount),
      refundsProcessed,
      averagePrepMinutes,
      delayedOrders: kitchenItems.filter(
        (item) => (item.actualPrepMinutes ?? 0) > item.estimatedPrepMinutes,
      ).length,
      generatedAt: new Date(),
    };
    const record = await tx.employeePerformance.upsert({
      where: {
        tenantId_employeeId_businessDate: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          businessDate,
        },
      },
      create: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        businessDate,
        ...data,
      },
      update: data,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: true,
          },
        },
      },
    });
    this.events.publish({
      type: EmployeeEvent.performanceUpdated,
      tenantId: employee.tenantId,
      outletId: employee.outletId,
      referenceId: record.id,
    });
    return { ...record, averagePrepMinutes: Number(record.averagePrepMinutes) };
  }

  private dates(query: EmployeeQueryDto): Date[] {
    const start = new Date(query.businessDate ?? query.fromDate ?? this.today());
    const end = new Date(query.businessDate ?? query.toDate ?? start);
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000);
    if (days < 0) throw new NotFoundException('fromDate must not exceed toDate');
    const result: Date[] = [];
    for (let index = 0; index <= Math.min(days, 366); index += 1) {
      result.push(new Date(start.getTime() + index * 86400000));
    }
    return result;
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }
}

function sum<T>(rows: T[], selector: (row: T) => number): number {
  return rows.reduce((total, row) => total + selector(row), 0);
}
