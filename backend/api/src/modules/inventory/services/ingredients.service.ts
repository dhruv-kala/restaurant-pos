import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  CreateIngredientDto,
  CreateInventoryCategoryDto,
  CreateUnitOfMeasureDto,
} from '../dto/create-ingredient.dto';
import type { InventoryQueryDto } from '../dto/inventory-query.dto';
import type {
  UpdateIngredientDto,
  UpdateInventoryCategoryDto,
  UpdateUnitOfMeasureDto,
} from '../dto/update-ingredient.dto';
import {
  requireInventoryRead,
  requireInventoryWrite,
  resolveInventoryScope,
} from './inventory-access.util';
import { decimal, pageMeta } from './inventory-response.util';

const include = { category: true, unit: true } satisfies Prisma.IngredientInclude;
type IngredientRecord = Prisma.IngredientGetPayload<{ include: typeof include }>;

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async categories(query: InventoryQueryDto, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(query.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      return tx.inventoryCategory.findMany({
        where: {
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(query.search
            ? { name: { contains: query.search.trim(), mode: 'insensitive' } }
            : {}),
        },
        orderBy: { name: 'asc' },
      });
    });
  }

  async createCategory(dto: CreateInventoryCategoryDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const tenantId = this.tenant(dto.tenantId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      return tx.inventoryCategory.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          isActive: dto.isActive,
        },
      });
    });
  }

  async updateCategory(
    id: string,
    dto: UpdateInventoryCategoryDto,
    user: AuthenticatedUser,
  ) {
    requireInventoryWrite(user);
    const tenantId = this.tenant(dto.tenantId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      await this.exists(tx.inventoryCategory.count({ where: { id, tenantId, deletedAt: null } }));
      return tx.inventoryCategory.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          isActive: dto.isActive,
          version: { increment: 1 },
        },
      });
    });
  }

  async units(query: InventoryQueryDto, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(query.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const units = await tx.unitOfMeasure.findMany({
        where: {
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
        orderBy: [{ baseUnit: 'desc' }, { name: 'asc' }],
      });
      return units.map((unit) => ({
        ...unit,
        conversionFactor: decimal(unit.conversionFactor),
      }));
    });
  }

  async createUnit(dto: CreateUnitOfMeasureDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const tenantId = this.tenant(dto.tenantId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      const unit = await tx.unitOfMeasure.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          baseUnit: dto.baseUnit,
          conversionFactor: dto.conversionFactor,
        },
      });
      return { ...unit, conversionFactor: decimal(unit.conversionFactor) };
    });
  }

  async updateUnit(id: string, dto: UpdateUnitOfMeasureDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const tenantId = this.tenant(dto.tenantId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      await this.exists(tx.unitOfMeasure.count({ where: { id, tenantId, deletedAt: null } }));
      const unit = await tx.unitOfMeasure.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          baseUnit: dto.baseUnit,
          conversionFactor: dto.conversionFactor,
          version: { increment: 1 },
        },
      });
      return { ...unit, conversionFactor: decimal(unit.conversionFactor) };
    });
  }

  async create(dto: CreateIngredientDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const tenantId = this.tenant(dto.tenantId, user);
    this.stockLevels(dto.minimumStock, dto.maximumStock);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      await this.references(tx, tenantId, dto.categoryId, dto.unitId);
      const ingredient = await tx.ingredient.create({
        data: {
          tenantId,
          categoryId: dto.categoryId,
          unitId: dto.unitId,
          name: dto.name.trim(),
          sku: dto.sku.trim().toUpperCase(),
          barcode: dto.barcode?.trim(),
          description: dto.description?.trim(),
          costPrice: dto.costPrice,
          reorderLevel: dto.reorderLevel,
          minimumStock: dto.minimumStock,
          maximumStock: dto.maximumStock,
          trackExpiry: dto.trackExpiry,
          isActive: dto.isActive,
          createdByUserId: user.id,
          updatedByUserId: user.id,
        },
        include,
      });
      return this.map(ingredient);
    });
  }

  async findAll(query: InventoryQueryDto, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(query.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.IngredientWhereInput = {
        deletedAt: null,
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
                { sku: { contains: query.search.trim(), mode: 'insensitive' } },
                { barcode: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.ingredient.findMany({
          where,
          include,
          orderBy: { name: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.ingredient.count({ where }),
      ]);
      return { data: data.map((item) => this.map(item)), meta: pageMeta(query.page, query.limit, total) };
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const ingredient = await tx.ingredient.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
        include: { ...include, stocks: { include: { batches: true } } },
      });
      if (!ingredient) throw new NotFoundException('Ingredient not found');
      return {
        ...this.map(ingredient),
        stocks: ingredient.stocks.map((stock) => ({
          ...stock,
          availableQuantity: decimal(stock.availableQuantity),
          reservedQuantity: decimal(stock.reservedQuantity),
          damagedQuantity: decimal(stock.damagedQuantity),
          batches: stock.batches.map((batch) => ({ ...batch, quantity: decimal(batch.quantity) })),
        })),
      };
    });
  }

  async update(id: string, dto: UpdateIngredientDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const tenantId = this.tenant(dto.tenantId, user);
    if (dto.minimumStock !== undefined) this.stockLevels(dto.minimumStock, dto.maximumStock);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      const existing = await tx.ingredient.findFirst({ where: { id, tenantId, deletedAt: null } });
      if (!existing) throw new NotFoundException('Ingredient not found');
      await this.references(
        tx,
        tenantId,
        dto.categoryId ?? existing.categoryId,
        dto.unitId ?? existing.unitId,
      );
      const ingredient = await tx.ingredient.update({
        where: { id },
        data: {
          categoryId: dto.categoryId,
          unitId: dto.unitId,
          name: dto.name?.trim(),
          sku: dto.sku?.trim().toUpperCase(),
          barcode: dto.barcode?.trim(),
          description: dto.description?.trim(),
          costPrice: dto.costPrice,
          reorderLevel: dto.reorderLevel,
          minimumStock: dto.minimumStock,
          maximumStock: dto.maximumStock,
          trackExpiry: dto.trackExpiry,
          isActive: dto.isActive,
          updatedByUserId: user.id,
          version: { increment: 1 },
        },
        include,
      });
      return this.map(ingredient);
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    requireInventoryWrite(user);
    const scope = resolveInventoryScope(undefined, undefined, user, false);
    await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const ingredient = await tx.ingredient.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
      });
      if (!ingredient) throw new NotFoundException('Ingredient not found');
      const activity = await tx.stockTransaction.count({
        where: { tenantId: ingredient.tenantId, ingredientId: id },
      });
      await tx.ingredient.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: activity === 0 ? new Date() : undefined,
          updatedByUserId: user.id,
          version: { increment: 1 },
        },
      });
    });
  }

  private tenant(requested: string | undefined, user: AuthenticatedUser): string {
    const tenantId = resolveInventoryScope(requested, undefined, user, false).tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return tenantId;
  }

  private async references(
    tx: Prisma.TransactionClient,
    tenantId: string,
    categoryId: string,
    unitId: string,
  ) {
    const [category, unit] = await Promise.all([
      tx.inventoryCategory.count({ where: { id: categoryId, tenantId, deletedAt: null, isActive: true } }),
      tx.unitOfMeasure.count({ where: { id: unitId, tenantId, deletedAt: null } }),
    ]);
    if (category !== 1 || unit !== 1) {
      throw new BadRequestException('Category and unit must belong to the tenant');
    }
  }

  private async exists(count: Promise<number>) {
    if ((await count) !== 1) throw new NotFoundException('Inventory record not found');
  }

  private stockLevels(minimum: number, maximum?: number) {
    if (maximum !== undefined && maximum < minimum) {
      throw new BadRequestException('maximumStock must be greater than or equal to minimumStock');
    }
  }

  private map(item: IngredientRecord) {
    return {
      ...item,
      reorderLevel: decimal(item.reorderLevel),
      minimumStock: decimal(item.minimumStock),
      maximumStock: item.maximumStock ? decimal(item.maximumStock) : null,
    };
  }
}
