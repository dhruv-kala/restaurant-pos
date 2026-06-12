import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  CreateProductionRecipeDto,
  UpdateProductionRecipeDto,
} from '../dto/create-production-recipe.dto';
import type { RecipeQueryDto } from '../dto/recipe-query.dto';
import { requireRecipeAccess, resolveRecipeScope } from './recipe-access.util';

const include = {
  outputIngredient: true,
  yieldUnit: true,
  ingredients: {
    include: { ingredient: true, unit: true },
    orderBy: { ingredient: { name: 'asc' as const } },
  },
} satisfies Prisma.ProductionRecipeInclude;
type Record = Prisma.ProductionRecipeGetPayload<{ include: typeof include }>;

@Injectable()
export class ProductionRecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductionRecipeDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const tenantId = this.tenant(dto.tenantId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      await this.validate(tx, tenantId, dto);
      return this.map(
        await tx.productionRecipe.create({
          data: {
            tenantId,
            outputIngredientId: dto.outputIngredientId,
            yieldUnitId: dto.yieldUnitId,
            name: dto.name.trim(),
            description: dto.description?.trim(),
            yieldQuantity: dto.yieldQuantity,
            isActive: dto.isActive,
            createdByUserId: user.id,
            updatedByUserId: user.id,
            ingredients: {
              create: dto.ingredients?.map((item) => ({
                tenantId,
                ingredientId: item.ingredientId,
                unitId: item.unitId,
                quantity: item.quantity,
              })),
            },
          },
          include,
        }),
      );
    });
  }

  async findAll(query: RecipeQueryDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(query.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const data = await tx.productionRecipe.findMany({
        where: {
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(query.search
            ? { name: { contains: query.search.trim(), mode: 'insensitive' } }
            : {}),
        },
        include,
        orderBy: { name: 'asc' },
      });
      return data.map((item) => this.map(item));
    });
  }

  async update(
    id: string,
    dto: UpdateProductionRecipeDto,
    user: AuthenticatedUser,
  ) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(dto.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const existing = await tx.productionRecipe.findFirst({
        where: { id, deletedAt: null, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        include,
      });
      if (!existing) throw new NotFoundException('Production recipe not found');
      const merged: CreateProductionRecipeDto = {
        tenantId: existing.tenantId,
        outputIngredientId: dto.outputIngredientId ?? existing.outputIngredientId ?? undefined,
        yieldUnitId: dto.yieldUnitId ?? existing.yieldUnitId,
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description ?? undefined,
        yieldQuantity: dto.yieldQuantity ?? existing.yieldQuantity.toNumber(),
        isActive: dto.isActive ?? existing.isActive,
        ingredients:
          dto.ingredients ??
          existing.ingredients.map((item) => ({
            ingredientId: item.ingredientId,
            unitId: item.unitId,
            quantity: item.quantity.toNumber(),
            wastagePercentage: 0,
          })),
      };
      await this.validate(tx, existing.tenantId, merged);
      if (dto.ingredients) {
        await tx.productionRecipeIngredient.deleteMany({
          where: { tenantId: existing.tenantId, productionRecipeId: id },
        });
      }
      return this.map(
        await tx.productionRecipe.update({
          where: { id },
          data: {
            outputIngredientId: dto.outputIngredientId,
            yieldUnitId: dto.yieldUnitId,
            name: dto.name?.trim(),
            description: dto.description?.trim(),
            yieldQuantity: dto.yieldQuantity,
            isActive: dto.isActive,
            updatedByUserId: user.id,
            version: { increment: 1 },
            ingredients: dto.ingredients
              ? {
                  create: dto.ingredients.map((item) => ({
                    tenantId: existing.tenantId,
                    ingredientId: item.ingredientId,
                    unitId: item.unitId,
                    quantity: item.quantity,
                  })),
                }
              : undefined,
          },
          include,
        }),
      );
    });
  }

  private tenant(requested: string | undefined, user: AuthenticatedUser): string {
    const tenantId = resolveRecipeScope(requested, undefined, user, false).tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return tenantId;
  }

  private async validate(
    tx: Prisma.TransactionClient,
    tenantId: string,
    dto: CreateProductionRecipeDto,
  ) {
    if (
      dto.ingredients &&
      new Set(dto.ingredients.map((item) => item.ingredientId)).size !==
        dto.ingredients.length
    ) {
      throw new BadRequestException('Duplicate production ingredients are not allowed');
    }
    const ingredientIds = [...new Set(dto.ingredients?.map((item) => item.ingredientId) ?? [])];
    const unitIds = [...new Set(dto.ingredients?.map((item) => item.unitId) ?? [])];
    const [unit, output, inputs, inputUnits] = await Promise.all([
      tx.unitOfMeasure.count({ where: { id: dto.yieldUnitId, tenantId, deletedAt: null } }),
      dto.outputIngredientId
        ? tx.ingredient.count({
            where: { id: dto.outputIngredientId, tenantId, deletedAt: null },
          })
        : Promise.resolve(1),
      tx.ingredient.count({
        where: {
          id: { in: ingredientIds },
          tenantId,
          deletedAt: null,
        },
      }),
      tx.unitOfMeasure.count({
        where: { id: { in: unitIds }, tenantId, deletedAt: null },
      }),
    ]);
    if (
      unit !== 1 ||
      output !== 1 ||
      inputs !== ingredientIds.length ||
      inputUnits !== unitIds.length
    ) {
      throw new BadRequestException('Production recipe references must belong to the tenant');
    }
  }

  private map(record: Record) {
    return {
      ...record,
      yieldQuantity: record.yieldQuantity.toNumber(),
      yieldUnit: {
        ...record.yieldUnit,
        conversionFactor: record.yieldUnit.conversionFactor.toNumber(),
      },
      ingredients: record.ingredients.map((item) => ({
        ...item,
        quantity: item.quantity.toNumber(),
        unit: { ...item.unit, conversionFactor: item.unit.conversionFactor.toNumber() },
      })),
    };
  }
}
