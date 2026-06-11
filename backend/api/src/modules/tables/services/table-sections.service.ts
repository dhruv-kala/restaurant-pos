import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateTableSectionDto } from '../dto/create-table-section.dto';
import type {
  TableSectionListResponseDto,
  TableSectionResponseDto,
} from '../dto/table-response.dto';
import type { TableQueryDto } from '../dto/table-query.dto';
import type { UpdateTableSectionDto } from '../dto/update-table-section.dto';
import { requireTableRead, requireTableWrite, resolveTableScope } from './table-access.util';

const sectionSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  name: true,
  description: true,
  displayOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TableSectionSelect;

@Injectable()
export class TableSectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateTableSectionDto,
    user: AuthenticatedUser,
  ): Promise<TableSectionResponseDto> {
    requireTableWrite(user);
    const scope = resolveTableScope(dto.tenantId, dto.outletId, user, true);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const outlet = await tx.outlet.findFirst({
        where: {
          id: scope.outletId,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        },
        select: { id: true, tenantId: true },
      });
      if (outlet === null) throw new NotFoundException('Outlet not found');
      try {
        return await tx.tableSection.create({
          data: {
            tenantId: outlet.tenantId,
            outletId: outlet.id,
            name: dto.name.trim(),
            description: dto.description?.trim(),
            displayOrder: dto.displayOrder,
            isActive: dto.isActive,
          },
          select: sectionSelect,
        });
      } catch (error: unknown) {
        this.throwConflict(error);
      }
    });
  }

  async findAll(
    query: TableQueryDto,
    user: AuthenticatedUser,
  ): Promise<TableSectionListResponseDto> {
    requireTableRead(user);
    const scope = resolveTableScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.TableSectionWhereInput = {
        deletedAt: null,
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        ...(query.search?.trim()
          ? {
              name: {
                contains: query.search.trim(),
                mode: 'insensitive',
              },
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.tableSection.findMany({
          where,
          select: sectionSelect,
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.tableSection.count({ where }),
      ]);
      return {
        data,
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
    return this.withSection(id, user, (_tx, section) => Promise.resolve(section));
  }

  async update(id: string, dto: UpdateTableSectionDto, user: AuthenticatedUser) {
    requireTableWrite(user);
    return this.withSection(id, user, async (tx, section) => {
      try {
        return await tx.tableSection.update({
          where: { id: section.id },
          data: {
            name: dto.name?.trim(),
            description: dto.description?.trim(),
            displayOrder: dto.displayOrder,
            isActive: dto.isActive,
            version: { increment: 1 },
          },
          select: sectionSelect,
        });
      } catch (error: unknown) {
        this.throwConflict(error);
      }
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    requireTableWrite(user);
    await this.withSection(id, user, async (tx, section) => {
      const tableCount = await tx.diningTable.count({
        where: {
          tenantId: section.tenantId,
          outletId: section.outletId,
          sectionId: id,
          deletedAt: null,
        },
      });
      if (tableCount > 0) {
        throw new ConflictException('Section must be empty before deletion');
      }
      await tx.tableSection.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false, version: { increment: 1 } },
      });
    });
  }

  private async withSection<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (tx: Prisma.TransactionClient, section: TableSectionResponseDto) => Promise<T>,
  ): Promise<T> {
    const scope = resolveTableScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const section = await tx.tableSection.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        select: sectionSelect,
      });
      if (section === null) throw new NotFoundException('Table section not found');
      return operation(tx, section);
    });
  }

  private throwConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Section name already exists in this outlet');
    }
    throw error;
  }
}
