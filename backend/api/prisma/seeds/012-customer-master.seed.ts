import { SeedContext } from './seed-context';
import { upsertSystemSetting } from './master-data.util';

export async function seedCustomerMaster({ prisma }: SeedContext): Promise<void> {
  await upsertSystemSetting(
    prisma,
    'LoyaltySettings',
    'customers',
    {
      customerTypes: ['WALK_IN', 'REGULAR', 'VIP', 'CORPORATE', 'DELIVERY'],
      enabled: false,
      pointsPerMinorUnit: 0,
    },
    'Customer classification and loyalty defaults.',
  );
  await upsertSystemSetting(
    prisma,
    'Timezone',
    'platform',
    { default: 'Asia/Kolkata', storage: 'UTC', identifiers: 'IANA' },
    'Timezone storage and display policy.',
  );
  console.log('012: seeded customer and timezone settings.');
}
