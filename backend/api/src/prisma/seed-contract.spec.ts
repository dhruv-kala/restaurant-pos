import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PERMISSIONS } from '../../prisma/seeds/006-permissions.seed';
import { buildSeedConfiguration } from '../../prisma/seeds/seed-configuration';

const seedNames = [
  'countries',
  'currencies',
  'languages',
  'timezones',
  'roles',
  'permissions',
  'role-permissions',
  'order-master',
  'payment-master',
  'inventory-master',
  'kitchen-master',
  'customer-master',
  'demo-tenant',
  'demo-outlet',
  'demo-users',
  'demo-tables',
  'demo-menu',
  'demo-inventory',
  'demo-recipes',
  'demo-customers',
] as const;

describe('database seed contract', () => {
  it('defines the complete numbered seed sequence', () => {
    for (const [index, name] of seedNames.entries()) {
      const prefix = (index + 1).toString().padStart(3, '0');
      const contents = readFileSync(
        join(process.cwd(), 'prisma', 'seeds', `${prefix}-${name}.seed.ts`),
        'utf8',
      );
      expect(contents.length).toBeGreaterThan(0);
    }
  });

  it('provides at least 150 granular permissions', () => {
    expect(PERMISSIONS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(PERMISSIONS.map((item) => item.permissionKey)).size).toBe(
      PERMISSIONS.length,
    );
  });

  it('blocks demo data in production', () => {
    expect(() =>
      buildSeedConfiguration(['--mode=demo'], { NODE_ENV: 'production' }),
    ).toThrow('Demo seeding is prohibited in production.');

    expect(
      buildSeedConfiguration(['--mode=all'], { NODE_ENV: 'production' })
        .includeDemoData,
    ).toBe(false);
  });
});
