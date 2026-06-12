import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireCustomerRead, resolveCustomerScope } from './customer-access.util';

@Injectable()
export class CustomerStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordSuccessfulPayment(tx: Prisma.TransactionClient, paymentId: string) {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { bill: { include: { order: true } } },
    });
    const customerId = payment?.bill.order.customerId;
    if (!payment || !customerId || payment.paidAmount <= 0) return;
    await tx.customerVisit.upsert({
      where: {
        tenantId_paymentId: {
          tenantId: payment.tenantId,
          paymentId: payment.id,
        },
      },
      update: {},
      create: {
        tenantId: payment.tenantId,
        outletId: payment.outletId,
        customerId,
        orderId: payment.bill.orderId,
        billId: payment.billId,
        paymentId: payment.id,
        businessDate: payment.businessDate,
        visitDate: payment.paidAt ?? new Date(),
        totalSpend: payment.paidAmount,
      },
    });
    await this.rebuild(tx, payment.tenantId, customerId);
  }

  async get(customerId: string, user: AuthenticatedUser) {
    requireCustomerRead(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const customer = await tx.customer.count({
        where: {
          id: customerId,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
      });
      if (!customer) throw new NotFoundException('Customer not found');
      return this.project(tx, customerId, scope.tenantId, scope.outletId);
    });
  }

  private async rebuild(
    tx: Prisma.TransactionClient,
    tenantId: string,
    customerId: string,
  ) {
    const stats = await this.project(tx, customerId, tenantId);
    await tx.customerStats.upsert({
      where: { tenantId_customerId: { tenantId, customerId } },
      create: {
        tenantId,
        customerId,
        totalOrders: stats.totalOrders,
        totalSpend: stats.totalSpend,
        averageOrderValue: stats.averageOrderValue,
        firstVisitAt: stats.firstVisitAt,
        lastVisitAt: stats.lastVisitAt,
        favoriteOutletId: stats.favoriteOutletId,
      },
      update: {
        totalOrders: stats.totalOrders,
        totalSpend: stats.totalSpend,
        averageOrderValue: stats.averageOrderValue,
        firstVisitAt: stats.firstVisitAt,
        lastVisitAt: stats.lastVisitAt,
        favoriteOutletId: stats.favoriteOutletId,
      },
    });
  }

  private async project(
    tx: Prisma.TransactionClient,
    customerId: string,
    tenantId?: string,
    outletId?: string,
  ) {
    const visits = await tx.customerVisit.findMany({
      where: {
        customerId,
        ...(tenantId ? { tenantId } : {}),
        ...(outletId ? { outletId } : {}),
      },
      select: {
        orderId: true,
        outletId: true,
        totalSpend: true,
        visitDate: true,
        outlet: { select: { id: true, name: true } },
      },
      orderBy: { visitDate: 'asc' },
    });
    const orderIds = new Set(visits.flatMap((visit) => (visit.orderId ? [visit.orderId] : [])));
    const totalSpend = visits.reduce((sum, visit) => sum + visit.totalSpend, 0);
    const outletCounts = new Map<string, { count: number; name: string }>();
    for (const visit of visits) {
      const current = outletCounts.get(visit.outletId);
      outletCounts.set(visit.outletId, {
        count: (current?.count ?? 0) + 1,
        name: visit.outlet.name,
      });
    }
    const favorite = [...outletCounts.entries()].sort(
      (left, right) => right[1].count - left[1].count,
    )[0];
    return {
      customerId,
      totalOrders: orderIds.size,
      totalSpend,
      averageOrderValue: orderIds.size ? Math.round(totalSpend / orderIds.size) : 0,
      firstVisitAt: visits[0]?.visitDate ?? null,
      lastVisitAt: visits.at(-1)?.visitDate ?? null,
      favoriteOutletId: favorite?.[0] ?? null,
      favoriteOutlet: favorite ? { id: favorite[0], name: favorite[1].name } : null,
    };
  }
}
