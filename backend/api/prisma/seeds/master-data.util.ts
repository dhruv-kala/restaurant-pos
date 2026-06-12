import { Prisma } from '@prisma/client';

export async function upsertSystemSetting(
  prisma: Prisma.TransactionClient,
  settingKey: string,
  category: string,
  value: Prisma.InputJsonValue,
  description: string,
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { settingKey },
    update: { category, value, description, isActive: true },
    create: { settingKey, category, value, description },
  });
}

export async function upsertApplicationModules(
  prisma: Prisma.TransactionClient,
): Promise<void> {
  const modules = [
    ['POS', 'Point of Sale', 'Orders, tables, billing, and payments'],
    ['KITCHEN', 'Kitchen', 'Kitchen display, routing, and preparation metrics'],
    ['INVENTORY', 'Inventory', 'Stock, purchasing, recipes, and wastage'],
    ['CUSTOMERS', 'Customers', 'Customer profiles and visit history'],
    ['REPORTS', 'Reports', 'Operational and financial reporting'],
    ['LOYALTY', 'Loyalty', 'Rewards, wallet, and referrals'],
    ['HR', 'Human Resources', 'Employees, shifts, attendance, and performance'],
  ] as const;

  for (const [moduleKey, name, description] of modules) {
    await prisma.applicationModule.upsert({
      where: { moduleKey },
      update: { name, description, isActive: true },
      create: { moduleKey, name, description },
    });
  }
}
