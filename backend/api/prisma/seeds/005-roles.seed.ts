import { SeedContext } from './seed-context';

export const SYSTEM_ROLES = [
  ['SUPER_ADMIN', 'Super Admin', 'SaaS platform administration', true],
  ['TENANT_ADMIN', 'Tenant Admin', 'Restaurant tenant administration', false],
  ['MANAGER', 'Manager', 'Outlet operations management', false],
  ['CASHIER', 'Cashier', 'Billing and payment operations', false],
  ['WAITER', 'Waiter', 'Table and order operations', false],
  ['KITCHEN_STAFF', 'Kitchen Staff', 'Kitchen preparation operations', false],
  ['INVENTORY_MANAGER', 'Inventory Manager', 'Inventory and purchasing', false],
  ['HR_MANAGER', 'HR Manager', 'Employee and shift administration', false],
  ['CUSTOMER', 'Customer', 'Customer self-service access', false],
] as const;

export async function seedRoles({ prisma }: SeedContext): Promise<void> {
  for (const [roleKey, name, description, isPlatformRole] of SYSTEM_ROLES) {
    await prisma.systemRoleTemplate.upsert({
      where: { roleKey },
      update: { name, description, isPlatformRole, isActive: true },
      create: { roleKey, name, description, isPlatformRole },
    });
  }
  console.log(`005: seeded ${SYSTEM_ROLES.length} system role templates.`);
}
