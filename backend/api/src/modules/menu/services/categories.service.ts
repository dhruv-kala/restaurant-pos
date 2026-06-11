import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateCategoryDto } from '../dto/create-category.dto';
import type {
  MenuCategoryListResponseDto,
  MenuCategoryResponseDto,
} from '../dto/menu-response.dto';
import type { MenuQueryDto } from '../dto/menu-query.dto';
import type { UpdateCategoryDto } from '../dto/update-category.dto';
import {
  requireMenuRole,
  resolveMenuTenantId,
} from './menu-access.util';

const categorySelect = {
  id: true,
  tenantId: true,
  parentId: true,
  name: true,
  description: true,
  displayOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MenuCategorySelect;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateCategoryDto,
    user: AuthenticatedUser,
  ): Promise<MenuCategoryResponseDto> {
    requireMenuRole(user);
    const tenantId = resolveMenuTenantId(dto.tenantId, user, true)!;

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      await this.assertParent(transaction, tenantId, dto.parentId);
      try {
        return await transaction.menuCategory.create({
          data: {
            tenantId,
            parentId: dto.parentId,
            name: dto.name.trim(),
            description: dto.description?.trim(),
            displayOrder: dto.displayOrder,
            isActive: dto.isActive,
          },
          select: categorySelect,
        });
      } catch (error: unknown) {
        this.throwPersistenceError(error);
      }
    });
  }

  async findAll(
    query: MenuQueryDto,
    user: AuthenticatedUser,
  ): Promise<MenuCategoryListResponseDto> {
    requireMenuRole(user);
    const tenantId = resolveMenuTenantId(query.tenantId, user, false);

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const where: Prisma.MenuCategoryWhereInput = {
        deletedAt: null,
        ...(tenantId === undefined ? {} : { tenantId }),
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
        transaction.menuCategory.findMany({
          where,
          select: categorySelect,
          orderBy: [
            { displayOrder: query.sortDirection ?? 'asc' },
            { name: 'asc' },
          ],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.menuCategory.count({ where }),
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

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<MenuCategoryResponseDto> {
    requireMenuRole(user);
    const tenantId = resolveMenuTenantId(undefined, user, false);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const category = await transaction.menuCategory.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(tenantId === undefined ? {} : { tenantId }),
        },
        select: categorySelect,
      });
      if (category === null) {
        throw new NotFoundException('Menu category not found');
      }
      return category;
    });
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    user: AuthenticatedUser,
  ): Promise<MenuCategoryResponseDto> {
    requireMenuRole(user);
    return this.withCategory(id, user, async (transaction, category) => {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      await this.assertParent(
        transaction,
        category.tenantId,
        dto.parentId,
        category.id,
      );
      try {
        return await transaction.menuCategory.update({
          where: { id: category.id },
          data: {
            parentId: dto.parentId,
            name: dto.name?.trim(),
            description: dto.description?.trim(),
            displayOrder: dto.displayOrder,
            isActive: dto.isActive,
            version: { increment: 1 },
          },
          select: categorySelect,
        });
      } catch (error: unknown) {
        this.throwPersistenceError(error);
      }
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    requireMenuRole(user);
    await this.withCategory(id, user, async (transaction, category) => {
      const [childCount, itemCount] = await Promise.all([
        transaction.menuCategory.count({
          where: {
            tenantId: category.tenantId,
            parentId: id,
            deletedAt: null,
          },
        }),
        transaction.menuItem.count({
          where: {
            tenantId: category.tenantId,
            categoryId: id,
            deletedAt: null,
          },
        }),
      ]);
      if (childCount > 0 || itemCount > 0) {
        throw new ConflictException(
          'Category must be empty before it can be deleted',
        );
      }
      await transaction.menuCategory.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false, version: { increment: 1 } },
      });
    });
  }

  private async withCategory<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (
      transaction: Prisma.TransactionClient,
      category: { id: string; tenantId: string },
    ) => Promise<T>,
  ): Promise<T> {
    const tenantId = resolveMenuTenantId(undefined, user, false);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const category = await transaction.menuCategory.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(tenantId === undefined ? {} : { tenantId }),
        },
        select: { id: true, tenantId: true },
      });
      if (category === null) {
        throw new NotFoundException('Menu category not found');
      }
      return operation(transaction, category);
    });
  }

  private async assertParent(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    parentId: string | undefined,
    categoryId?: string,
  ): Promise<void> {
    if (parentId === undefined) {
      return;
    }
    let currentId: string | null = parentId;
    let parentFound = false;
    while (currentId !== null) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'Category hierarchy cannot contain a cycle',
        );
      }
      const parentRecord: { id: string; parentId: string | null } | null =
        await transaction.menuCategory.findFirst({
        where: { id: currentId, tenantId, deletedAt: null },
        select: { id: true, parentId: true },
      });
      if (parentRecord === null) {
        break;
      }
      parentFound = true;
      currentId = parentRecord.parentId;
    }
    if (!parentFound) {
      throw new BadRequestException('Parent category is not in this tenant');
    }
  }

  private throwPersistenceError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Category name already exists for this tenant');
    }
    throw error;
  }
}
