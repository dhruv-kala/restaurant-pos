import { Prisma } from '@prisma/client';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
} from './010-inventory-master.seed';
import { requireDemoValue, SeedContext } from './seed-context';

const INGREDIENTS = [
  ['Burger Bun', 'ING-BUN', 'PCS', 'Packaging', 1800, 50],
  ['Cheese Slice', 'ING-CHEESE', 'PCS', 'Dairy', 1200, 80],
  ['Paneer', 'ING-PANEER', 'GRAM', 'Dairy', 45, 10000],
  ['Tomato', 'ING-TOMATO', 'GRAM', 'Vegetables', 8, 15000],
  ['Sauce', 'ING-SAUCE', 'ML', 'Spices', 12, 8000],
  ['Potato', 'ING-POTATO', 'GRAM', 'Vegetables', 4, 20000],
  ['Milk', 'ING-MILK', 'ML', 'Dairy', 7, 12000],
  ['Soft Drinks', 'ING-SOFT-DRINK', 'PCS', 'Beverages', 3500, 120],
] as const;

export async function seedDemoInventory(context: SeedContext): Promise<void> {
  const tenantId = requireDemoValue(context.demo.tenantId, 'tenant');
  const outletId = requireDemoValue(context.demo.outletId, 'outlet');
  const adminUserId = requireDemoValue(context.demo.adminUserId, 'admin user');

  for (const name of INVENTORY_CATEGORIES) {
    const category = await context.prisma.inventoryCategory.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: { isActive: true, deletedAt: null },
      create: { tenantId, name },
    });
    context.demo.categoryIds[`inventory:${name}`] = category.id;
  }

  for (const code of INVENTORY_UNITS) {
    const unit = await context.prisma.unitOfMeasure.upsert({
      where: { tenantId_code: { tenantId, code } },
      update: {
        name: code,
        baseUnit: ['KG', 'LITER', 'PCS'].includes(code),
        conversionFactor: conversionFactor(code),
        deletedAt: null,
      },
      create: {
        tenantId,
        code,
        name: code,
        baseUnit: ['KG', 'LITER', 'PCS'].includes(code),
        conversionFactor: conversionFactor(code),
      },
    });
    context.demo.unitIds[code] = unit.id;
  }

  for (const [name, sku, unitCode, categoryName, costPrice, quantity] of INGREDIENTS) {
    const ingredient = await context.prisma.ingredient.upsert({
      where: { tenantId_sku: { tenantId, sku } },
      update: {
        categoryId: requireDemoValue(context.demo.categoryIds[`inventory:${categoryName}`], categoryName),
        unitId: requireDemoValue(context.demo.unitIds[unitCode], unitCode),
        name,
        costPrice,
        reorderLevel: new Prisma.Decimal(quantity / 5),
        minimumStock: new Prisma.Decimal(quantity / 10),
        isActive: true,
        updatedByUserId: adminUserId,
        deletedAt: null,
      },
      create: {
        tenantId,
        categoryId: requireDemoValue(context.demo.categoryIds[`inventory:${categoryName}`], categoryName),
        unitId: requireDemoValue(context.demo.unitIds[unitCode], unitCode),
        name,
        sku,
        costPrice,
        reorderLevel: new Prisma.Decimal(quantity / 5),
        minimumStock: new Prisma.Decimal(quantity / 10),
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
      },
    });
    context.demo.ingredientIds[name] = ingredient.id;
    await context.prisma.inventoryStock.upsert({
      where: { tenantId_outletId_ingredientId: { tenantId, outletId, ingredientId: ingredient.id } },
      update: { availableQuantity: new Prisma.Decimal(quantity) },
      create: {
        tenantId,
        outletId,
        ingredientId: ingredient.id,
        availableQuantity: new Prisma.Decimal(quantity),
      },
    });
  }
  console.log(`018: seeded ${INGREDIENTS.length} ingredients and outlet stock.`);
}

function conversionFactor(code: string): Prisma.Decimal {
  if (code === 'GRAM') return new Prisma.Decimal('0.001');
  if (code === 'ML') return new Prisma.Decimal('0.001');
  if (code === 'DOZEN') return new Prisma.Decimal('12');
  return new Prisma.Decimal('1');
}
