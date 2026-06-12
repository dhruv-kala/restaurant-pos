import { Prisma } from '@prisma/client';
import { requireDemoValue, seedUuid, SeedContext } from './seed-context';

const RECIPES = [
  ['Paneer Tikka', [['Paneer', 'GRAM', 200], ['Tomato', 'GRAM', 40], ['Sauce', 'ML', 25]]],
  ['Veg Burger', [['Burger Bun', 'PCS', 1], ['Cheese Slice', 'PCS', 1], ['Tomato', 'GRAM', 30], ['Sauce', 'ML', 20], ['Potato', 'GRAM', 120]]],
  ['Chicken Burger', [['Burger Bun', 'PCS', 1], ['Cheese Slice', 'PCS', 1], ['Tomato', 'GRAM', 30], ['Sauce', 'ML', 20]]],
  ['Margherita Pizza', [['Cheese Slice', 'PCS', 3], ['Tomato', 'GRAM', 100], ['Sauce', 'ML', 50]]],
  ['Ice Cream', [['Milk', 'ML', 180]]],
] as const;

export async function seedDemoRecipes(context: SeedContext): Promise<void> {
  const tenantId = requireDemoValue(context.demo.tenantId, 'tenant');
  const adminUserId = requireDemoValue(context.demo.adminUserId, 'admin user');
  const yieldUnitId = requireDemoValue(context.demo.unitIds.PCS, 'PCS');

  for (const [index, [menuItemName, ingredients]] of RECIPES.entries()) {
    const recipeId = seedUuid(3000 + index);
    const recipe = await context.prisma.recipe.upsert({
      where: { tenantId_id: { tenantId, id: recipeId } },
      update: {
        menuItemId: requireDemoValue(context.demo.menuItemIds[menuItemName], menuItemName),
        yieldUnitId,
        name: `${menuItemName} Standard Recipe`,
        isActive: true,
        updatedByUserId: adminUserId,
        deletedAt: null,
      },
      create: {
        id: recipeId,
        tenantId,
        menuItemId: requireDemoValue(context.demo.menuItemIds[menuItemName], menuItemName),
        yieldUnitId,
        name: `${menuItemName} Standard Recipe`,
        yieldQuantity: new Prisma.Decimal(1),
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
      },
    });
    for (const [ingredientName, unitCode, quantity] of ingredients) {
      const ingredientId = requireDemoValue(context.demo.ingredientIds[ingredientName], ingredientName);
      await context.prisma.recipeIngredient.upsert({
        where: {
          tenantId_recipeId_ingredientId: {
            tenantId,
            recipeId: recipe.id,
            ingredientId,
          },
        },
        update: {
          unitId: requireDemoValue(context.demo.unitIds[unitCode], unitCode),
          quantity: new Prisma.Decimal(quantity),
        },
        create: {
          tenantId,
          recipeId: recipe.id,
          ingredientId,
          unitId: requireDemoValue(context.demo.unitIds[unitCode], unitCode),
          quantity: new Prisma.Decimal(quantity),
        },
      });
    }
  }
  console.log(`019: seeded ${RECIPES.length} menu recipes.`);
}
