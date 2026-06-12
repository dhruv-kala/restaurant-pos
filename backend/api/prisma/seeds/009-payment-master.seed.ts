import { SeedContext } from './seed-context';
import { upsertSystemSetting } from './master-data.util';

export async function seedPaymentMaster({ prisma }: SeedContext): Promise<void> {
  await upsertSystemSetting(
    prisma,
    'PaymentSettings',
    'payments',
    {
      methods: ['CASH', 'UPI', 'CARD', 'WALLET', 'GIFT_CARD', 'BANK_TRANSFER'],
      statuses: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'PARTIALLY_PAID', 'REFUNDED', 'CANCELLED'],
    },
    'Supported payment methods and lifecycle states.',
  );
  await upsertSystemSetting(
    prisma,
    'Currency',
    'finance',
    { default: 'INR', amountStorage: 'MINOR_UNITS' },
    'Default currency and money storage policy.',
  );
  await upsertSystemSetting(
    prisma,
    'TaxMode',
    'finance',
    { mode: 'GST', pricesIncludeTax: false },
    'Default tax calculation mode.',
  );
  await upsertSystemSetting(
    prisma,
    'ReceiptSettings',
    'receipts',
    { autoIssue: true, thermalWidthMm: 80, allowReprint: true },
    'Receipt generation defaults.',
  );
  console.log('009: seeded payment, currency, tax, and receipt settings.');
}
