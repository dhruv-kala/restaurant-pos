import { SeedContext } from './seed-context';

export async function seedCountries({ prisma }: SeedContext): Promise<void> {
  const countries = [
    ['IN', 'India', 'IND', '+91'],
    ['US', 'United States', 'USA', '+1'],
    ['GB', 'United Kingdom', 'GBR', '+44'],
    ['AE', 'United Arab Emirates', 'ARE', '+971'],
    ['SG', 'Singapore', 'SGP', '+65'],
    ['AU', 'Australia', 'AUS', '+61'],
    ['CA', 'Canada', 'CAN', '+1'],
    ['MY', 'Malaysia', 'MYS', '+60'],
    ['NZ', 'New Zealand', 'NZL', '+64'],
    ['ZA', 'South Africa', 'ZAF', '+27'],
  ] as const;
  for (const [code, name, isoCode, phoneCode] of countries) {
    await prisma.country.upsert({
      where: { code },
      update: { name, isoCode, phoneCode, isActive: true },
      create: { code, name, isoCode, phoneCode },
    });
  }
  console.log(`001: seeded ${countries.length} countries.`);
}
