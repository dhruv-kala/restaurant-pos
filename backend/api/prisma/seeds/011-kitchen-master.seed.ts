import { SeedContext } from './seed-context';
import { upsertSystemSetting } from './master-data.util';

export const KITCHEN_STATIONS = ['Main Kitchen', 'Tandoor', 'Bar', 'Dessert', 'Bakery'] as const;

export async function seedKitchenMaster({ prisma }: SeedContext): Promise<void> {
  await upsertSystemSetting(
    prisma,
    'KitchenSettings',
    'kitchen',
    { stations: KITCHEN_STATIONS, warningMinutes: 15, delayedMinutes: 25 },
    'Kitchen station templates and SLA defaults.',
  );
  console.log('011: seeded kitchen master catalog.');
}
