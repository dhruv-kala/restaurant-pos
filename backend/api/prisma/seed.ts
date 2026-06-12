import { PrismaClient } from '@prisma/client';
import { buildSeedConfiguration } from './seeds/seed-configuration';
import { createSeedContext, SeedStep } from './seeds/seed-context';
import { seedCountries } from './seeds/001-countries.seed';
import { seedCurrencies } from './seeds/002-currencies.seed';
import { seedLanguages } from './seeds/003-languages.seed';
import { seedTimezones } from './seeds/004-timezones.seed';
import { seedRoles } from './seeds/005-roles.seed';
import { seedPermissions } from './seeds/006-permissions.seed';
import { seedRolePermissions } from './seeds/007-role-permissions.seed';
import { seedOrderMaster } from './seeds/008-order-master.seed';
import { seedPaymentMaster } from './seeds/009-payment-master.seed';
import { seedInventoryMaster } from './seeds/010-inventory-master.seed';
import { seedKitchenMaster } from './seeds/011-kitchen-master.seed';
import { seedCustomerMaster } from './seeds/012-customer-master.seed';
import { seedDemoTenant } from './seeds/013-demo-tenant.seed';
import { seedDemoOutlet } from './seeds/014-demo-outlet.seed';
import { seedDemoUsers } from './seeds/015-demo-users.seed';
import { seedDemoTables } from './seeds/016-demo-tables.seed';
import { seedDemoMenu } from './seeds/017-demo-menu.seed';
import { seedDemoInventory } from './seeds/018-demo-inventory.seed';
import { seedDemoRecipes } from './seeds/019-demo-recipes.seed';
import { seedDemoCustomers } from './seeds/020-demo-customers.seed';

const prisma = new PrismaClient();

const masterSteps: SeedStep[] = [
  seedCountries,
  seedCurrencies,
  seedLanguages,
  seedTimezones,
  seedRoles,
  seedPermissions,
  seedRolePermissions,
  seedOrderMaster,
  seedPaymentMaster,
  seedInventoryMaster,
  seedKitchenMaster,
  seedCustomerMaster,
];

const demoSteps: SeedStep[] = [
  seedDemoTenant,
  seedDemoOutlet,
  seedDemoUsers,
  seedDemoTables,
  seedDemoMenu,
  seedDemoInventory,
  seedDemoRecipes,
  seedDemoCustomers,
];

async function main(): Promise<void> {
  const configuration = buildSeedConfiguration(process.argv.slice(2), process.env);

  console.log(
    `Seeding ${configuration.environment} with mode ${configuration.mode}.`,
  );

  await prisma.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT set_config('app.is_platform_admin', 'true', true)
      `;

      const context = createSeedContext(transaction, configuration);
      for (const step of masterSteps) {
        await step(context);
      }
      if (configuration.includeDemoData) {
        for (const step of demoSteps) {
          await step(context);
        }
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  if (!configuration.includeDemoData) {
    console.log('Demo data was excluded by the environment/mode policy.');
  }
  console.log('Database seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
