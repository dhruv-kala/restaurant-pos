import { SeedContext } from './seed-context';

export async function seedCurrencies({ prisma }: SeedContext): Promise<void> {
  const currencies = [
    ['INR', 'Indian Rupee', '₹', 2],
    ['USD', 'US Dollar', '$', 2],
    ['GBP', 'Pound Sterling', '£', 2],
    ['EUR', 'Euro', '€', 2],
    ['AED', 'UAE Dirham', 'د.إ', 2],
    ['SGD', 'Singapore Dollar', 'S$', 2],
    ['AUD', 'Australian Dollar', 'A$', 2],
    ['CAD', 'Canadian Dollar', 'C$', 2],
  ] as const;
  for (const [code, name, symbol, decimalPlaces] of currencies) {
    await prisma.currency.upsert({
      where: { code },
      update: { name, symbol, decimalPlaces, isActive: true },
      create: { code, name, symbol, decimalPlaces },
    });
  }
  console.log(`002: seeded ${currencies.length} currencies.`);
}
