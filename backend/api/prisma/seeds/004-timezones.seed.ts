import { SeedContext } from './seed-context';

export async function seedTimezones({ prisma }: SeedContext): Promise<void> {
  const timezones = [
    ['Asia/Kolkata', 'India Standard Time', '+05:30'],
    ['UTC', 'Coordinated Universal Time', '+00:00'],
    ['Asia/Dubai', 'Gulf Standard Time', '+04:00'],
    ['Asia/Singapore', 'Singapore Standard Time', '+08:00'],
    ['Europe/London', 'London', '+00:00'],
    ['America/New_York', 'US Eastern Time', '-05:00'],
    ['America/Chicago', 'US Central Time', '-06:00'],
    ['Australia/Sydney', 'Sydney', '+10:00'],
  ] as const;
  for (const [timezoneId, displayName, utcOffset] of timezones) {
    await prisma.timezone.upsert({
      where: { timezoneId },
      update: { displayName, utcOffset },
      create: { timezoneId, displayName, utcOffset },
    });
  }
  console.log(`004: seeded ${timezones.length} timezones.`);
}
