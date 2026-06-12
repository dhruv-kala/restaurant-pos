import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  CreateRecipeDto,
  CreateRecipeIngredientDto,
} from '../dto/create-recipe.dto';
import type { RecipeQueryDto } from '../dto/recipe-query.dto';
import type {
  UpdateRecipeDto,
  UpdateRecipeIngredientDto,
} from '../dto/update-recipe.dto';
import { RecipeEvent } from '../enums/recipe-events';
import { requireRecipeAccess, resolveRecipeScope } from './recipe-access.util';
import { RecipeEventsService } from './recipe-events.service';

export const recipeInclude = {
  menuItem: true,
  variant: true,
  yieldUnit: true,
  ingredients: {
    include: { ingredient: { include: { unit: true } }, unit: true },
    orderBy: { ingredient: { name: 'asc' as const } },
  },
  costSnapshots: { orderBy: { calculatedAt: 'desc' as const }, take: 10 },
} satisfies Prisma.RecipeInclude;

export type RecipeRecord = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: RecipeEventsService,
  ) {}

  async create(dto: CreateRecipeDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const tenantId = this.tenant(dto.tenantId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      await this.validateTarget(tx, tenantId, dto.menuItemId, dto.variantId, dto.yieldUnitId);
      await this.validateIngredients(tx, tenantId, dto.ingredients ?? []);
      const recipe = await tx.recipe.create({
        data: {
          tenantId,
          menuItemId: dto.menuItemId,
          variantId: dto.variantId,
          yieldUnitId: dto.yieldUnitId,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          yieldQuantity: dto.yieldQuantity,
          portionMultiplier: dto.portionMultiplier,
          isActive: dto.isActive,
          createdByUserId: user.id,
          updatedByUserId: user.id,
          ingredients: {
            create: dto.ingredients?.map((item) => this.ingredientData(tenantId, item)),
          },
        },
        include: recipeInclude,
      });
      this.updated(recipe);
      return this.map(recipe);
    });
  }

  async findAll(query: RecipeQueryDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(query.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.RecipeWhereInput = {
        deletedAt: null,
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(query.menuItemId ? { menuItemId: query.menuItemId } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
                { menuItem: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.recipe.findMany({
          where,
          include: recipeInclude,
          orderBy: { name: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.recipe.count({ where }),
      ]);
      return {
        data: data.map((recipe) => this.map(recipe)),
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
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      return this.map(await this.record(tx, id, scope.tenantId));
    });
  }

  async update(id: string, dto: UpdateRecipeDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(dto.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const existing = await this.record(tx, id, scope.tenantId);
      await this.validateTarget(
        tx,
        existing.tenantId,
        dto.menuItemId ?? existing.menuItemId,
        dto.variantId ?? existing.variantId ?? undefined,
        dto.yieldUnitId ?? existing.yieldUnitId,
      );
      if (dto.ingredients) {
        await this.validateIngredients(tx, existing.tenantId, dto.ingredients);
        await tx.recipeIngredient.deleteMany({
          where: { tenantId: existing.tenantId, recipeId: id },
        });
      }
      const recipe = await tx.recipe.update({
        where: { id },
        data: {
          menuItemId: dto.menuItemId,
          variantId: dto.variantId,
          yieldUnitId: dto.yieldUnitId,
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          yieldQuantity: dto.yieldQuantity,
          portionMultiplier: dto.portionMultiplier,
          isActive: dto.isActive,
          updatedByUserId: user.id,
          version: { increment: 1 },
          ingredients: dto.ingredients
            ? {
                create: dto.ingredients.map((item) =>
                  this.ingredientData(existing.tenantId, item),
                ),
              }
            : undefined,
        },
        include: recipeInclude,
      });
      this.updated(recipe);
      return this.map(recipe);
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(undefined, undefined, user, false);
    await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const recipe = await this.record(tx, id, scope.tenantId);
      await tx.recipe.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedByUserId: user.id,
          version: { increment: 1 },
        },
      });
      this.updated(recipe);
    });
  }

  async ingredients(id: string, user: AuthenticatedUser) {
    const recipe = await this.findOne(id, user);
    return recipe.ingredients;
  }

  async addIngredient(
    id: string,
    dto: CreateRecipeIngredientDto,
    user: AuthenticatedUser,
  ) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const recipe = await this.record(tx, id, scope.tenantId);
      await this.validateIngredients(tx, recipe.tenantId, [dto]);
      const item = await tx.recipeIngredient.create({
        data: {
          tenantId: recipe.tenantId,
          recipeId: id,
          ingredientId: dto.ingredientId,
          unitId: dto.unitId,
          quantity: dto.quantity,
          wastagePercentage: dto.wastagePercentage,
          notes: dto.notes?.trim(),
        },
        include: { ingredient: { include: { unit: true } }, unit: true },
      });
      await tx.recipe.update({
        where: { id },
        data: { updatedByUserId: user.id, version: { increment: 1 } },
      });
      this.updated(recipe);
      return this.mapIngredient(item);
    });
  }

  async updateIngredient(
    id: string,
    dto: UpdateRecipeIngredientDto,
    user: AuthenticatedUser,
  ) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const existing = await tx.recipeIngredient.findFirst({
        where: { id, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        include: { recipe: true },
      });
      if (!existing) throw new NotFoundException('Recipe ingredient not found');
      const candidate: CreateRecipeIngredientDto = {
        ingredientId: dto.ingredientId ?? existing.ingredientId,
        unitId: dto.unitId ?? existing.unitId,
        quantity: dto.quantity ?? existing.quantity.toNumber(),
        wastagePercentage:
          dto.wastagePercentage ?? existing.wastagePercentage.toNumber(),
        notes: dto.notes ?? existing.notes ?? undefined,
      };
      await this.validateIngredients(tx, existing.tenantId, [candidate]);
      const item = await tx.recipeIngredient.update({
        where: { id },
        data: {
          ingredientId: dto.ingredientId,
          unitId: dto.unitId,
          quantity: dto.quantity,
          wastagePercentage: dto.wastagePercentage,
          notes: dto.notes?.trim(),
        },
        include: { ingredient: { include: { unit: true } }, unit: true },
      });
      await tx.recipe.update({
        where: { id: existing.recipeId },
        data: { updatedByUserId: user.id, version: { increment: 1 } },
      });
      this.updated(existing.recipe);
      return this.mapIngredient(item);
    });
  }

  async removeIngredient(id: string, user: AuthenticatedUser): Promise<void> {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(undefined, undefined, user, false);
    await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const existing = await tx.recipeIngredient.findFirst({
        where: { id, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        include: { recipe: true },
      });
      if (!existing) throw new NotFoundException('Recipe ingredient not found');
      await tx.recipeIngredient.delete({ where: { id } });
      await tx.recipe.update({
        where: { id: existing.recipeId },
        data: { updatedByUserId: user.id, version: { increment: 1 } },
      });
      this.updated(existing.recipe);
    });
  }

  private tenant(requested: string | undefined, user: AuthenticatedUser): string {
    const tenantId = resolveRecipeScope(requested, undefined, user, false).tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return tenantId;
  }

  private async record(
    tx: Prisma.TransactionClient,
    id: string,
    tenantId?: string,
  ): Promise<RecipeRecord> {
    const recipe = await tx.recipe.findFirst({
      where: { id, deletedAt: null, ...(tenantId ? { tenantId } : {}) },
      include: recipeInclude,
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    return recipe;
  }

  private async validateTarget(
    tx: Prisma.TransactionClient,
    tenantId: string,
    menuItemId: string,
    variantId: string | undefined,
    yieldUnitId: string,
  ) {
    const [menu, unit, variant] = await Promise.all([
      tx.menuItem.count({ where: { id: menuItemId, tenantId, deletedAt: null } }),
      tx.unitOfMeasure.count({ where: { id: yieldUnitId, tenantId, deletedAt: null } }),
      variantId
        ? tx.menuItemVariant.count({
            where: { id: variantId, tenantId, menuItemId, deletedAt: null },
          })
        : Promise.resolve(1),
    ]);
    if (menu !== 1 || unit !== 1 || variant !== 1) {
      throw new BadRequestException('Menu item, variant, and yield unit must belong to the tenant');
    }
  }

  private async validateIngredients(
    tx: Prisma.TransactionClient,
    tenantId: string,
    items: CreateRecipeIngredientDto[],
  ) {
    if (new Set(items.map((item) => item.ingredientId)).size !== items.length) {
      throw new BadRequestException('Duplicate recipe ingredients are not allowed');
    }
    for (const item of items) {
      const [ingredient, unit] = await Promise.all([
        tx.ingredient.count({
          where: { id: item.ingredientId, tenantId, isActive: true, deletedAt: null },
        }),
        tx.unitOfMeasure.count({ where: { id: item.unitId, tenantId, deletedAt: null } }),
      ]);
      if (ingredient !== 1 || unit !== 1) {
        throw new BadRequestException('Ingredient and unit must belong to the tenant');
      }
    }
  }

  private ingredientData(
    tenantId: string,
    item: CreateRecipeIngredientDto,
  ) {
    return {
      tenantId,
      ingredientId: item.ingredientId,
      unitId: item.unitId,
      quantity: item.quantity,
      wastagePercentage: item.wastagePercentage,
      notes: item.notes?.trim(),
    };
  }

  private updated(recipe: { tenantId: string; id: string }) {
    this.events.publish({
      type: RecipeEvent.recipeUpdated,
      tenantId: recipe.tenantId,
      referenceId: recipe.id,
    });
  }

  map(recipe: RecipeRecord) {
    return {
      ...recipe,
      yieldQuantity: recipe.yieldQuantity.toNumber(),
      portionMultiplier: recipe.portionMultiplier.toNumber(),
      yieldUnit: {
        ...recipe.yieldUnit,
        conversionFactor: recipe.yieldUnit.conversionFactor.toNumber(),
      },
      ingredients: recipe.ingredients.map((item) => this.mapIngredient(item)),
    };
  }

  private mapIngredient(item: RecipeRecord['ingredients'][number]) {
    return {
      ...item,
      quantity: item.quantity.toNumber(),
      wastagePercentage: item.wastagePercentage.toNumber(),
      unit: { ...item.unit, conversionFactor: item.unit.conversionFactor.toNumber() },
      ingredient: {
        ...item.ingredient,
        reorderLevel: item.ingredient.reorderLevel.toNumber(),
        minimumStock: item.ingredient.minimumStock.toNumber(),
        maximumStock: item.ingredient.maximumStock?.toNumber() ?? null,
        unit: {
          ...item.ingredient.unit,
          conversionFactor: item.ingredient.unit.conversionFactor.toNumber(),
        },
      },
    };
  }
}
