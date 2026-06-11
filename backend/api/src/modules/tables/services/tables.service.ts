import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiningTableStatus, Prisma } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateTableDto } from '../dto/create-table.dto';
import type { MergeTableDto } from '../dto/merge-table.dto';
import type { SplitTableDto } from '../dto/split-table.dto';
import type {
  DiningTableListResponseDto,
  DiningTableResponseDto,
  MergedTableResponseDto,
} from '../dto/table-response.dto';
import type { TableQueryDto } from '../dto/table-query.dto';
import type { TransferTableDto } from '../dto/transfer-table.dto';
import type { UpdateTableStatusDto } from '../dto/update-table-status.dto';
import type { UpdateTableDto } from '../dto/update-table.dto';
import { requireTableRead, requireTableWrite, resolveTableScope } from './table-access.util';

const tableSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  sectionId: true,
  tableNumber: true,
  displayName: true,
  capacity: true,
  status: true,
  xPosition: true,
  yPosition: true,
  shape: true,
  isActive: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DiningTableSelect;

type TableRecord = Prisma.DiningTableGetPayload<{ select: typeof tableSelect }>;

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTableDto, user: AuthenticatedUser): Promise<DiningTableResponseDto> {
    requireTableWrite(user);
    const scope = resolveTableScope(dto.tenantId, dto.outletId, user, true);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const section = await tx.tableSection.findFirst({
        where: {
          id: dto.sectionId,
          outletId: scope.outletId,
          deletedAt: null,
          isActive: true,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        },
        select: { tenantId: true, outletId: true },
      });
      if (section === null) {
        throw new BadRequestException('Section is not active in this outlet');
      }
      try {
        const table = await tx.diningTable.create({
          data: {
            tenantId: section.tenantId,
            outletId: section.outletId,
            sectionId: dto.sectionId,
            tableNumber: dto.tableNumber.trim().toUpperCase(),
            displayName: dto.displayName?.trim(),
            capacity: dto.capacity,
            status: dto.status,
            xPosition: dto.xPosition,
            yPosition: dto.yPosition,
            shape: dto.shape,
            isActive: dto.isActive,
          },
          select: tableSelect,
        });
        return this.toResponse(table);
      } catch (error: unknown) {
        this.throwConflict(error);
      }
    });
  }

  async findAll(
    query: TableQueryDto,
    user: AuthenticatedUser,
  ): Promise<DiningTableListResponseDto> {
    requireTableRead(user);
    const scope = resolveTableScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.DiningTableWhereInput = {
        deletedAt: null,
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        ...(query.sectionId === undefined ? {} : { sectionId: query.sectionId }),
        ...(query.status === undefined ? {} : { status: query.status }),
        ...(query.search?.trim()
          ? {
              OR: [
                {
                  tableNumber: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  displayName: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.diningTable.findMany({
          where,
          select: tableSelect,
          orderBy: { tableNumber: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.diningTable.count({ where }),
      ]);
      return {
        data: data.map((table) => this.toResponse(table)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    requireTableRead(user);
    return this.withTable(id, user, (_tx, table) => Promise.resolve(this.toResponse(table)));
  }

  async update(id: string, dto: UpdateTableDto, user: AuthenticatedUser) {
    requireTableWrite(user);
    return this.withTable(id, user, async (tx, table) => {
      if (dto.sectionId !== undefined) {
        const section = await tx.tableSection.findFirst({
          where: {
            id: dto.sectionId,
            tenantId: table.tenantId,
            outletId: table.outletId,
            isActive: true,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (section === null) {
          throw new BadRequestException('Section is not active in this outlet');
        }
      }
      try {
        const updated = await tx.diningTable.update({
          where: { id },
          data: {
            sectionId: dto.sectionId,
            tableNumber: dto.tableNumber?.trim().toUpperCase(),
            displayName: dto.displayName?.trim(),
            capacity: dto.capacity,
            xPosition: dto.xPosition,
            yPosition: dto.yPosition,
            shape: dto.shape,
            isActive: dto.isActive,
            version: { increment: 1 },
          },
          select: tableSelect,
        });
        return this.toResponse(updated);
      } catch (error: unknown) {
        this.throwConflict(error);
      }
    });
  }

  async updateStatus(id: string, dto: UpdateTableStatusDto, user: AuthenticatedUser) {
    requireTableWrite(user);
    return this.withTable(id, user, async (tx) => {
      const updated = await tx.diningTable.update({
        where: { id },
        data: { status: dto.status, version: { increment: 1 } },
        select: tableSelect,
      });
      return this.toResponse(updated);
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    requireTableWrite(user);
    await this.withTable(id, user, async (tx, table) => {
      if (
        table.status === DiningTableStatus.OCCUPIED ||
        table.status === DiningTableStatus.RESERVED
      ) {
        throw new ConflictException('Occupied or reserved tables cannot be deleted');
      }
      const activeReservation = await tx.tableReservation.count({
        where: {
          tenantId: table.tenantId,
          tableId: id,
          deletedAt: null,
          status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
        },
      });
      if (activeReservation > 0) {
        throw new ConflictException('Table has active reservations');
      }
      await tx.diningTable.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          status: DiningTableStatus.OUT_OF_SERVICE,
          version: { increment: 1 },
        },
      });
    });
  }

  async merge(dto: MergeTableDto, user: AuthenticatedUser): Promise<MergedTableResponseDto> {
    requireTableWrite(user);
    const ids = [dto.primaryTableId, ...dto.tableIds];
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Merge table IDs must be unique');
    }
    const scope = resolveTableScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const tables = await tx.diningTable.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
          isActive: true,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        select: { id: true, tenantId: true, outletId: true, status: true },
      });
      if (tables.length !== ids.length) {
        throw new BadRequestException('All merge tables must be accessible');
      }
      if (new Set(tables.map(({ outletId }) => outletId)).size !== 1) {
        throw new BadRequestException('Tables must belong to the same outlet');
      }
      if (tables.some(({ status }) => status !== DiningTableStatus.AVAILABLE)) {
        throw new ConflictException('Only available tables can be merged');
      }
      const primary = tables.find(({ id }) => id === dto.primaryTableId)!;
      const existingMerge = await tx.mergedTable.count({
        where: {
          tenantId: primary.tenantId,
          outletId: primary.outletId,
          isActive: true,
          deletedAt: null,
          OR: [{ primaryTableId: { in: ids } }, { mergedTableIds: { hasSome: ids } }],
        },
      });
      if (existingMerge > 0) {
        throw new ConflictException('A table is already part of an active merge');
      }
      const merged = await tx.mergedTable.create({
        data: {
          tenantId: primary.tenantId,
          outletId: primary.outletId,
          primaryTableId: primary.id,
          mergedTableIds: dto.tableIds,
        },
      });
      await tx.diningTable.updateMany({
        where: { id: { in: dto.tableIds } },
        data: {
          status: DiningTableStatus.OUT_OF_SERVICE,
          version: { increment: 1 },
        },
      });
      return merged;
    });
  }

  async split(dto: SplitTableDto, user: AuthenticatedUser): Promise<MergedTableResponseDto> {
    requireTableWrite(user);
    const scope = resolveTableScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const merged = await tx.mergedTable.findFirst({
        where: {
          id: dto.mergedTableId,
          isActive: true,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
      });
      if (merged === null) throw new NotFoundException('Merged table not found');
      await tx.diningTable.updateMany({
        where: { id: { in: merged.mergedTableIds } },
        data: {
          status: DiningTableStatus.AVAILABLE,
          version: { increment: 1 },
        },
      });
      await tx.mergedTable.update({
        where: { id: merged.id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
      return merged;
    });
  }

  async transfer(dto: TransferTableDto, user: AuthenticatedUser) {
    requireTableWrite(user);
    if (dto.fromTableId === dto.toTableId) {
      throw new BadRequestException('Transfer tables must be different');
    }
    const scope = resolveTableScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const tables = await tx.diningTable.findMany({
        where: {
          id: { in: [dto.fromTableId, dto.toTableId] },
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        select: tableSelect,
      });
      if (tables.length !== 2 || tables[0].outletId !== tables[1].outletId) {
        throw new BadRequestException('Transfer tables must share an outlet');
      }
      const from = tables.find(({ id }) => id === dto.fromTableId)!;
      const to = tables.find(({ id }) => id === dto.toTableId)!;
      if (from.status !== DiningTableStatus.OCCUPIED || to.status !== DiningTableStatus.AVAILABLE) {
        throw new ConflictException(
          'Transfer requires an occupied source and available destination',
        );
      }
      await tx.diningTable.update({
        where: { id: from.id },
        data: {
          status: DiningTableStatus.AVAILABLE,
          version: { increment: 1 },
        },
      });
      const destination = await tx.diningTable.update({
        where: { id: to.id },
        data: {
          status: DiningTableStatus.OCCUPIED,
          version: { increment: 1 },
        },
        select: tableSelect,
      });
      return this.toResponse(destination);
    });
  }

  private async withTable<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (tx: Prisma.TransactionClient, table: TableRecord) => Promise<T>,
  ): Promise<T> {
    const scope = resolveTableScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const table = await tx.diningTable.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        select: tableSelect,
      });
      if (table === null) throw new NotFoundException('Dining table not found');
      return operation(tx, table);
    });
  }

  private toResponse(table: TableRecord): DiningTableResponseDto {
    return {
      ...table,
      xPosition: table.xPosition.toNumber(),
      yPosition: table.yPosition.toNumber(),
    };
  }

  private throwConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Table number already exists in this outlet');
    }
    throw error;
  }
}
