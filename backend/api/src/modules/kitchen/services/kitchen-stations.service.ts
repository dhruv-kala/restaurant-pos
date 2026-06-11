import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateStationDto } from '../dto/create-station.dto';
import type { KitchenQueryDto } from '../dto/kitchen-query.dto';
import type { UpdateStationDto } from '../dto/update-station.dto';
import {
  requireKitchenConfigure,
  requireKitchenRead,
  resolveKitchenScope,
} from './kitchen-access.util';

const stationInclude = {
  assignments: { select: { id: true, menuItemId: true, createdAt: true } },
} satisfies Prisma.KitchenStationInclude;

@Injectable()
export class KitchenStationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: KitchenQueryDto, user: AuthenticatedUser) {
    requireKitchenRead(user);
    const scope = resolveKitchenScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      return tx.kitchenStation.findMany({
        where: {
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: stationInclude,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });
    });
  }

  async create(dto: CreateStationDto, user: AuthenticatedUser) {
    requireKitchenConfigure(user);
    const scope = resolveKitchenScope(dto.tenantId, dto.outletId, user, true);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const outlet = await tx.outlet.findFirst({
        where: {
          id: dto.outletId,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        },
        select: { tenantId: true },
      });
      if (outlet === null) throw new NotFoundException('Outlet not found');
      await this.assertMenuItems(tx, outlet.tenantId, dto.menuItemIds ?? []);
      return tx.kitchenStation.create({
        data: {
          tenantId: outlet.tenantId,
          outletId: dto.outletId,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          displayOrder: dto.displayOrder,
          isActive: dto.isActive,
          assignments: {
            create: (dto.menuItemIds ?? []).map((menuItemId) => ({
              tenantId: outlet.tenantId,
              outletId: dto.outletId,
              menuItemId,
            })),
          },
        },
        include: stationInclude,
      });
    });
  }

  async update(id: string, dto: UpdateStationDto, user: AuthenticatedUser) {
    requireKitchenConfigure(user);
    const scope = resolveKitchenScope(dto.tenantId, dto.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const station = await tx.kitchenStation.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
      });
      if (station === null) throw new NotFoundException('Kitchen station not found');
      if (dto.outletId !== undefined && dto.outletId !== station.outletId) {
        throw new ConflictException('Kitchen station outlet cannot be changed');
      }
      if (dto.menuItemIds !== undefined) {
        await this.assertMenuItems(tx, station.tenantId, dto.menuItemIds);
        await tx.kitchenStationAssignment.deleteMany({
          where: { tenantId: station.tenantId, kitchenStationId: id },
        });
        await tx.kitchenStationAssignment.createMany({
          data: dto.menuItemIds.map((menuItemId) => ({
            tenantId: station.tenantId,
            outletId: station.outletId,
            kitchenStationId: id,
            menuItemId,
          })),
        });
      }
      return tx.kitchenStation.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          displayOrder: dto.displayOrder,
          isActive: dto.isActive,
          version: { increment: 1 },
        },
        include: stationInclude,
      });
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ id: string }> {
    requireKitchenConfigure(user);
    const scope = resolveKitchenScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const station = await tx.kitchenStation.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
      });
      if (station === null) throw new NotFoundException('Kitchen station not found');
      const activeItems = await tx.orderItem.count({
        where: {
          tenantId: station.tenantId,
          kitchenStationId: station.id,
          status: { in: ['PENDING', 'PREPARING', 'READY'] },
          deletedAt: null,
        },
      });
      if (activeItems > 0) {
        throw new ConflictException('Station has active kitchen items');
      }
      await tx.kitchenStation.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date(), version: { increment: 1 } },
      });
      return { id };
    });
  }

  private async assertMenuItems(
    tx: Prisma.TransactionClient,
    tenantId: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) return;
    const count = await tx.menuItem.count({
      where: { tenantId, id: { in: ids }, deletedAt: null },
    });
    if (count !== ids.length) throw new NotFoundException('One or more menu items not found');
  }
}
