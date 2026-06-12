import { SeedContext } from './seed-context';
import { upsertSystemSetting } from './master-data.util';

export const INVENTORY_UNITS = ['KG', 'GRAM', 'LITER', 'ML', 'PCS', 'BOX', 'PACKET', 'DOZEN'] as const;
export const INVENTORY_CATEGORIES = ['Vegetables', 'Dairy', 'Beverages', 'Spices', 'Packaging', 'Frozen', 'Meat', 'Seafood'] as const;

export async function seedInventoryMaster({ prisma }: SeedContext): Promise<void> {
  await upsertSystemSetting(
    prisma,
    'InventorySettings',
    'inventory',
    {
      units: INVENTORY_UNITS,
      categories: INVENTORY_CATEGORIES,
      allowNegativeStock: false,
      lowStockAlerts: true,
    },
    'Inventory master catalog and default controls.',
  );
  console.log('010: seeded inventory master catalog.');
}
