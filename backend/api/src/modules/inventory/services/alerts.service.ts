import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { InventoryQueryDto } from '../dto/inventory-query.dto';
import {
  requireInventoryRead,
  requireInventoryWrite,
  resolveInventoryScope,
} from './inventory-access.util';
import { pageMeta } from './inventory-response.util';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: InventoryQueryDto, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.InventoryAlertWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        ...(query.ingredientId ? { ingredientId: query.ingredientId } : {}),
        ...(query.alertType ? { alertType: query.alertType } : {}),
        isResolved: query.isResolved ?? false,
      };
      const [data, total] = await Promise.all([
        tx.inventoryAlert.findMany({
          where,
          include: { ingredient: { include: { unit: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.inventoryAlert.count({ where }),
      ]);
      return {
        data: data.map((alert) => ({
          ...alert,
          ingredient: {
            ...alert.ingredient,
            reorderLevel: alert.ingredient.reorderLevel.toNumber(),
            minimumStock: alert.ingredient.minimumStock.toNumber(),
            maximumStock: alert.ingredient.maximumStock?.toNumber() ?? null,
            unit: {
              ...alert.ingredient.unit,
              conversionFactor: alert.ingredient.unit.conversionFactor.toNumber(),
            },
          },
        })),
        meta: pageMeta(query.page, query.limit, total),
      };
    });
  }

  async resolve(id: string, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const scope = resolveInventoryScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const alert = await tx.inventoryAlert.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
      });
      if (!alert) throw new NotFoundException('Inventory alert not found');
      return tx.inventoryAlert.update({
        where: { id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedByUserId: user.id,
        },
        include: { ingredient: { include: { unit: true } } },
      });
    });
  }
}
