import { Injectable } from '@nestjs/common';
import { Prisma, StockTransactionType } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { RecipeQueryDto } from '../dto/recipe-query.dto';
import { RecipeEvent } from '../enums/recipe-events';
import { requireRecipeAccess, resolveRecipeScope } from './recipe-access.util';
import { RecipeEventsService } from './recipe-events.service';
import { recipeInclude, type RecipeRecord } from './recipes.service';

@Injectable()
export class CostingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: RecipeEventsService,
  ) {}

  async calculate(id: string, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const recipe = await tx.recipe.findFirstOrThrow({
        where: { id, deletedAt: null, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        include: recipeInclude,
      });
      const result = await this.compute(tx, recipe);
      const latest = recipe.costSnapshots[0];
      if (!latest || latest.calculatedCost !== result.recipeCost) {
        await tx.recipeCostSnapshot.create({
          data: {
            tenantId: recipe.tenantId,
            recipeId: recipe.id,
            calculatedCost: result.recipeCost,
            ingredientBreakdown: result.ingredientBreakdown,
          },
        });
        this.events.publish({
          type: RecipeEvent.recipeCostChanged,
          tenantId: recipe.tenantId,
          referenceId: recipe.id,
        });
      }
      return result;
    });
  }

  async profitability(query: RecipeQueryDto, user: AuthenticatedUser) {
    requireRecipeAccess(user);
    const scope = resolveRecipeScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const recipes = await tx.recipe.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
        include: recipeInclude,
        orderBy: { name: 'asc' },
      });
      const rows = [];
      for (const recipe of recipes) {
        const cost = await this.compute(tx, recipe);
        const override = scope.outletId
          ? await tx.outletMenuPrice.findFirst({
              where: {
                tenantId: recipe.tenantId,
                outletId: scope.outletId,
                menuItemId: recipe.menuItemId,
                deletedAt: null,
              },
            })
          : null;
        const menuPrice =
          (override?.price ?? recipe.menuItem.price) +
          (recipe.variant?.priceAdjustment ?? 0);
        const grossProfit = menuPrice - cost.recipeCost;
        rows.push({
          recipeId: recipe.id,
          menuItemId: recipe.menuItemId,
          menuItemName: recipe.menuItem.name,
          variantName: recipe.variant?.name ?? null,
          menuPrice,
          recipeCost: cost.recipeCost,
          grossProfit,
          marginPercentage: menuPrice === 0 ? 0 : (grossProfit / menuPrice) * 100,
          foodCostPercentage: menuPrice === 0 ? 0 : (cost.recipeCost / menuPrice) * 100,
        });
      }
      return rows;
    });
  }

  async compute(tx: Prisma.TransactionClient, recipe: RecipeRecord) {
    const ingredientBreakdown = [];
    let recipeCost = 0;
    for (const line of recipe.ingredients) {
      const transactions = await tx.stockTransaction.findMany({
        where: {
          tenantId: recipe.tenantId,
          ingredientId: line.ingredientId,
          transactionType: StockTransactionType.PURCHASE,
          quantity: { gt: 0 },
        },
        select: { quantity: true, unitCost: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      const purchasedQuantity = transactions.reduce(
        (sum, item) => sum + item.quantity.toNumber(),
        0,
      );
      const averageCost =
        purchasedQuantity === 0
          ? line.ingredient.costPrice
          : Math.round(
              transactions.reduce(
                (sum, item) => sum + item.quantity.toNumber() * item.unitCost,
                0,
              ) / purchasedQuantity,
            );
      const normalizedQuantity =
        (line.quantity.toNumber() * line.unit.conversionFactor.toNumber()) /
        line.ingredient.unit.conversionFactor.toNumber();
      const withWastage =
        normalizedQuantity / (1 - line.wastagePercentage.toNumber() / 100);
      const perPortion =
        (withWastage / recipe.yieldQuantity.toNumber()) *
        recipe.portionMultiplier.toNumber();
      const lineCost = Math.round(perPortion * averageCost);
      recipeCost += lineCost;
      ingredientBreakdown.push({
        ingredientId: line.ingredientId,
        ingredientName: line.ingredient.name,
        quantity: perPortion,
        unitId: line.ingredient.unitId,
        unitCost: averageCost,
        lineCost,
        wastagePercentage: line.wastagePercentage.toNumber(),
      });
    }
    const menuPrice =
      recipe.menuItem.price + (recipe.variant?.priceAdjustment ?? 0);
    return {
      recipeId: recipe.id,
      recipeCost,
      menuPrice,
      foodCostPercentage: menuPrice === 0 ? 0 : (recipeCost / menuPrice) * 100,
      ingredientBreakdown,
      calculatedAt: new Date().toISOString(),
    };
  }
}
