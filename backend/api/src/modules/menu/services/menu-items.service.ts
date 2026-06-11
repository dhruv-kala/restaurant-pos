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
import type { CreateAddonDto } from '../dto/create-addon.dto';
import type { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import type { CreateVariantDto } from '../dto/create-variant.dto';
import type {
  MenuItemAddonResponseDto,
  MenuItemListResponseDto,
  MenuItemResponseDto,
  MenuItemVariantResponseDto,
} from '../dto/menu-response.dto';
import type { MenuQueryDto } from '../dto/menu-query.dto';
import type { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { MenuSortBy } from '../enums/menu-sort.enum';
import { requireMenuRead, requireMenuRole, resolveMenuTenantId } from './menu-access.util';

const itemInclude = {
  variants: {
    where: { deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  },
  addons: {
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  },
  outletPrices: {
    where: { deletedAt: null },
    orderBy: { outletId: 'asc' },
  },
} satisfies Prisma.MenuItemInclude;

type MenuItemRecord = Prisma.MenuItemGetPayload<{ include: typeof itemInclude }>;

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMenuItemDto, user: AuthenticatedUser): Promise<MenuItemResponseDto> {
    requireMenuRole(user);
    const tenantId = resolveMenuTenantId(dto.tenantId, user, true)!;
    this.assertSingleDefault(dto.variants);

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      await this.assertCategory(transaction, tenantId, dto.categoryId);
      await this.assertOutlets(
        transaction,
        tenantId,
        dto.outletPrices?.map(({ outletId }) => outletId),
      );
      try {
        const item = await transaction.menuItem.create({
          data: {
            tenantId,
            categoryId: dto.categoryId,
            kitchenCategoryId: dto.kitchenCategoryId,
            name: dto.name.trim(),
            description: dto.description?.trim(),
            sku: dto.sku?.trim().toUpperCase(),
            price: dto.price,
            costPrice: dto.costPrice,
            imageUrl: dto.imageUrl,
            isVegetarian: dto.isVegetarian,
            isVegan: dto.isVegan,
            isAvailable: dto.isAvailable,
            taxPercentage: dto.taxPercentage,
            variants: {
              create: dto.variants?.map((variant) => ({
                tenantId,
                name: variant.name.trim(),
                priceAdjustment: variant.priceAdjustment,
                isDefault: variant.isDefault,
              })),
            },
            addons: {
              create: dto.addons?.map((addon) => ({
                tenantId,
                name: addon.name.trim(),
                price: addon.price,
              })),
            },
            outletPrices: {
              create: dto.outletPrices?.map((price) => ({
                tenantId,
                outletId: price.outletId,
                price: price.price,
              })),
            },
          },
          include: itemInclude,
        });
        return this.toResponse(item);
      } catch (error: unknown) {
        this.throwPersistenceError(error);
      }
    });
  }

  async findAll(query: MenuQueryDto, user: AuthenticatedUser): Promise<MenuItemListResponseDto> {
    requireMenuRead(user);
    const tenantId = resolveMenuTenantId(query.tenantId, user, false);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const where: Prisma.MenuItemWhereInput = {
        deletedAt: null,
        ...(tenantId === undefined ? {} : { tenantId }),
        ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }),
        ...(query.isAvailable === undefined ? {} : { isAvailable: query.isAvailable }),
        ...(query.search?.trim()
          ? {
              OR: [
                {
                  name: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  sku: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        transaction.menuItem.findMany({
          where,
          include: itemInclude,
          orderBy: this.orderBy(query),
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.menuItem.count({ where }),
      ]);
      return {
        data: data.map((item) => this.toResponse(item)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<MenuItemResponseDto> {
    requireMenuRead(user);
    return this.withItem(id, user, (_transaction, item) => Promise.resolve(this.toResponse(item)));
  }

  async update(
    id: string,
    dto: UpdateMenuItemDto,
    user: AuthenticatedUser,
  ): Promise<MenuItemResponseDto> {
    requireMenuRole(user);
    this.assertSingleDefault(dto.variants);
    return this.withItem(id, user, async (transaction, existing) => {
      if (dto.categoryId !== undefined) {
        await this.assertCategory(transaction, existing.tenantId, dto.categoryId);
      }
      await this.assertOutlets(
        transaction,
        existing.tenantId,
        dto.outletPrices?.map(({ outletId }) => outletId),
      );

      if (dto.variants !== undefined) {
        await transaction.menuItemVariant.updateMany({
          where: {
            tenantId: existing.tenantId,
            menuItemId: id,
            deletedAt: null,
          },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
      }
      if (dto.addons !== undefined) {
        await transaction.menuItemAddon.updateMany({
          where: {
            tenantId: existing.tenantId,
            menuItemId: id,
            deletedAt: null,
          },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
      }
      if (dto.outletPrices !== undefined) {
        await transaction.outletMenuPrice.updateMany({
          where: {
            tenantId: existing.tenantId,
            menuItemId: id,
            deletedAt: null,
          },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
      }

      try {
        const item = await transaction.menuItem.update({
          where: { id },
          data: {
            categoryId: dto.categoryId,
            kitchenCategoryId: dto.kitchenCategoryId,
            name: dto.name?.trim(),
            description: dto.description?.trim(),
            sku: dto.sku?.trim().toUpperCase(),
            price: dto.price,
            costPrice: dto.costPrice,
            imageUrl: dto.imageUrl,
            isVegetarian: dto.isVegetarian,
            isVegan: dto.isVegan,
            isAvailable: dto.isAvailable,
            taxPercentage: dto.taxPercentage,
            version: { increment: 1 },
            variants:
              dto.variants === undefined
                ? undefined
                : {
                    create: dto.variants.map((variant) => ({
                      tenantId: existing.tenantId,
                      name: variant.name.trim(),
                      priceAdjustment: variant.priceAdjustment,
                      isDefault: variant.isDefault,
                    })),
                  },
            addons:
              dto.addons === undefined
                ? undefined
                : {
                    create: dto.addons.map((addon) => ({
                      tenantId: existing.tenantId,
                      name: addon.name.trim(),
                      price: addon.price,
                    })),
                  },
            outletPrices:
              dto.outletPrices === undefined
                ? undefined
                : {
                    create: dto.outletPrices.map((price) => ({
                      tenantId: existing.tenantId,
                      outletId: price.outletId,
                      price: price.price,
                    })),
                  },
          },
          include: itemInclude,
        });
        return this.toResponse(item);
      } catch (error: unknown) {
        this.throwPersistenceError(error);
      }
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    requireMenuRole(user);
    await this.withItem(id, user, async (transaction, item) => {
      const deletedAt = new Date();
      await Promise.all([
        transaction.menuItem.update({
          where: { id },
          data: {
            deletedAt,
            isAvailable: false,
            version: { increment: 1 },
          },
        }),
        transaction.menuItemVariant.updateMany({
          where: { tenantId: item.tenantId, menuItemId: id, deletedAt: null },
          data: { deletedAt, version: { increment: 1 } },
        }),
        transaction.menuItemAddon.updateMany({
          where: { tenantId: item.tenantId, menuItemId: id, deletedAt: null },
          data: { deletedAt, version: { increment: 1 } },
        }),
        transaction.outletMenuPrice.updateMany({
          where: { tenantId: item.tenantId, menuItemId: id, deletedAt: null },
          data: { deletedAt, version: { increment: 1 } },
        }),
      ]);
    });
  }

  async createVariant(
    itemId: string,
    dto: CreateVariantDto,
    user: AuthenticatedUser,
  ): Promise<MenuItemVariantResponseDto> {
    requireMenuRole(user);
    return this.withItem(itemId, user, async (transaction, item) => {
      if (dto.isDefault) {
        await transaction.menuItemVariant.updateMany({
          where: {
            tenantId: item.tenantId,
            menuItemId: itemId,
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false, version: { increment: 1 } },
        });
      }
      return transaction.menuItemVariant.create({
        data: {
          tenantId: item.tenantId,
          menuItemId: itemId,
          name: dto.name.trim(),
          priceAdjustment: dto.priceAdjustment,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async findVariants(
    itemId: string,
    user: AuthenticatedUser,
  ): Promise<MenuItemVariantResponseDto[]> {
    requireMenuRead(user);
    return this.withItem(itemId, user, (transaction, item) =>
      transaction.menuItemVariant.findMany({
        where: {
          tenantId: item.tenantId,
          menuItemId: itemId,
          deletedAt: null,
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
    );
  }

  async removeVariant(id: string, user: AuthenticatedUser): Promise<void> {
    await this.removeChild('variant', id, user);
  }

  async createAddon(
    itemId: string,
    dto: CreateAddonDto,
    user: AuthenticatedUser,
  ): Promise<MenuItemAddonResponseDto> {
    requireMenuRole(user);
    return this.withItem(itemId, user, (transaction, item) =>
      transaction.menuItemAddon.create({
        data: {
          tenantId: item.tenantId,
          menuItemId: itemId,
          name: dto.name.trim(),
          price: dto.price,
        },
      }),
    );
  }

  async findAddons(itemId: string, user: AuthenticatedUser): Promise<MenuItemAddonResponseDto[]> {
    requireMenuRead(user);
    return this.withItem(itemId, user, (transaction, item) =>
      transaction.menuItemAddon.findMany({
        where: {
          tenantId: item.tenantId,
          menuItemId: itemId,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async removeAddon(id: string, user: AuthenticatedUser): Promise<void> {
    await this.removeChild('addon', id, user);
  }

  private async removeChild(
    type: 'variant' | 'addon',
    id: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    requireMenuRole(user);
    const tenantId = resolveMenuTenantId(undefined, user, false);
    await this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const where = {
        id,
        deletedAt: null,
        ...(tenantId === undefined ? {} : { tenantId }),
      };
      const child =
        type === 'variant'
          ? await transaction.menuItemVariant.findFirst({
              where,
              select: { id: true },
            })
          : await transaction.menuItemAddon.findFirst({
              where,
              select: { id: true },
            });
      if (child === null) {
        throw new NotFoundException(`Menu item ${type} not found`);
      }
      if (type === 'variant') {
        await transaction.menuItemVariant.update({
          where: { id },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
      } else {
        await transaction.menuItemAddon.update({
          where: { id },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
      }
    });
  }

  private async withItem<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (transaction: Prisma.TransactionClient, item: MenuItemRecord) => Promise<T>,
  ): Promise<T> {
    const tenantId = resolveMenuTenantId(undefined, user, false);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const item = await transaction.menuItem.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(tenantId === undefined ? {} : { tenantId }),
        },
        include: itemInclude,
      });
      if (item === null) {
        throw new NotFoundException('Menu item not found');
      }
      return operation(transaction, item);
    });
  }

  private async assertCategory(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await transaction.menuCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (category === null) {
      throw new BadRequestException('Category is not active in this tenant');
    }
  }

  private async assertOutlets(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    outletIds: string[] | undefined,
  ): Promise<void> {
    if (outletIds === undefined || outletIds.length === 0) {
      return;
    }
    if (new Set(outletIds).size !== outletIds.length) {
      throw new BadRequestException('Outlet prices must be unique per outlet');
    }
    const count = await transaction.outlet.count({
      where: { tenantId, id: { in: outletIds }, deletedAt: null },
    });
    if (count !== outletIds.length) {
      throw new BadRequestException('Outlet price references another tenant');
    }
  }

  private assertSingleDefault(variants: CreateVariantDto[] | undefined): void {
    if ((variants?.filter(({ isDefault }) => isDefault).length ?? 0) > 1) {
      throw new BadRequestException('Only one variant can be the default');
    }
  }

  private orderBy(query: MenuQueryDto): Prisma.MenuItemOrderByWithRelationInput {
    const direction = query.sortDirection ?? 'desc';
    switch (query.sortBy) {
      case MenuSortBy.NAME:
        return { name: direction };
      case MenuSortBy.PRICE:
        return { price: direction };
      default:
        return { createdAt: direction };
    }
  }

  private toResponse(item: MenuItemRecord): MenuItemResponseDto {
    return {
      ...item,
      taxPercentage: item.taxPercentage.toNumber(),
      variants: item.variants,
      addons: item.addons,
      outletPrices: item.outletPrices,
    };
  }

  private throwPersistenceError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Menu SKU, variant, add-on, or outlet price already exists');
    }
    throw error;
  }
}
