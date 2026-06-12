import { SeedContext } from './seed-context';
import {
  upsertApplicationModules,
  upsertSystemSetting,
} from './master-data.util';

export async function seedOrderMaster({ prisma }: SeedContext): Promise<void> {
  await upsertApplicationModules(prisma);
  await upsertSystemSetting(
    prisma,
    'OrderSettings',
    'orders',
    {
      types: ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_ORDER'],
      statuses: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'],
      defaultType: 'DINE_IN',
    },
    'Global order workflow defaults.',
  );
  await upsertSystemSetting(
    prisma,
    'BusinessDateMode',
    'platform',
    { mode: 'OUTLET_TIMEZONE', cutoffTime: '04:00' },
    'Business date derivation policy.',
  );
  console.log('008: seeded order master data and application modules.');
}
