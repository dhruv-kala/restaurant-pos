import { requireDemoValue, SeedContext } from './seed-context';

const MENU = [
  ['Starters', 'Paneer Tikka', 'MENU-PANEER-TIKKA', 32000, true, 'Tandoor'],
  ['Main Course', 'Veg Burger', 'MENU-VEG-BURGER', 22000, true, 'Main Kitchen'],
  ['Main Course', 'Chicken Burger', 'MENU-CHICKEN-BURGER', 28000, false, 'Main Kitchen'],
  ['Main Course', 'Margherita Pizza', 'MENU-MARGHERITA-PIZZA', 36000, true, 'Bakery'],
  ['Drinks', 'Coke', 'MENU-COKE', 8000, true, 'Bar'],
  ['Drinks', 'Pepsi', 'MENU-PEPSI', 8000, true, 'Bar'],
  ['Desserts', 'Ice Cream', 'MENU-ICE-CREAM', 14000, true, 'Dessert'],
] as const;

export async function seedDemoMenu(context: SeedContext): Promise<void> {
  const tenantId = requireDemoValue(context.demo.tenantId, 'tenant');
  const outletId = requireDemoValue(context.demo.outletId, 'outlet');
  for (const [index, name] of ['Starters', 'Main Course', 'Drinks', 'Desserts'].entries()) {
    const category = await context.prisma.menuCategory.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: { displayOrder: index + 1, isActive: true, deletedAt: null },
      create: { tenantId, name, displayOrder: index + 1 },
    });
    context.demo.categoryIds[name] = category.id;
  }

  for (const [categoryName, name, sku, price, isVegetarian, stationName] of MENU) {
    const categoryId = requireDemoValue(context.demo.categoryIds[categoryName], categoryName);
    const item = await context.prisma.menuItem.upsert({
      where: { tenantId_sku: { tenantId, sku } },
      update: {
        categoryId,
        name,
        price,
        isVegetarian,
        isAvailable: true,
        taxPercentage: 5,
        deletedAt: null,
      },
      create: {
        tenantId,
        categoryId,
        name,
        sku,
        price,
        isVegetarian,
        taxPercentage: 5,
      },
    });
    context.demo.menuItemIds[name] = item.id;
    const stationId = requireDemoValue(context.demo.stationIds[stationName], stationName);
    await context.prisma.kitchenStationAssignment.upsert({
      where: {
        tenantId_outletId_kitchenStationId_menuItemId: {
          tenantId,
          outletId,
          kitchenStationId: stationId,
          menuItemId: item.id,
        },
      },
      update: {},
      create: {
        tenantId,
        outletId,
        kitchenStationId: stationId,
        menuItemId: item.id,
      },
    });
  }
  console.log(`017: seeded four menu categories and ${MENU.length} items.`);
}
