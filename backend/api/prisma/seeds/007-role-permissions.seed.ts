import { SeedContext } from './seed-context';
import { SYSTEM_ROLES } from './005-roles.seed';

const roleModules: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: [
    'outlets', 'users', 'roles', 'menu', 'tables', 'orders', 'kitchen',
    'billing', 'payments', 'receipts', 'inventory', 'purchasing', 'recipes',
    'customers', 'reports', 'employees', 'shifts', 'attendance', 'loyalty',
    'settings', 'audit',
  ],
  MANAGER: [
    'menu', 'tables', 'orders', 'kitchen', 'billing', 'payments', 'receipts',
    'inventory', 'purchasing', 'recipes', 'customers', 'reports', 'employees',
    'shifts', 'attendance',
  ],
  CASHIER: ['billing', 'payments', 'receipts', 'customers', 'orders', 'tables'],
  WAITER: ['orders', 'tables', 'menu', 'customers'],
  KITCHEN_STAFF: ['kitchen', 'orders', 'menu', 'inventory'],
  INVENTORY_MANAGER: ['inventory', 'purchasing', 'recipes', 'reports'],
  HR_MANAGER: ['employees', 'shifts', 'attendance', 'reports', 'users'],
  CUSTOMER: ['menu', 'orders', 'receipts', 'loyalty'],
};

export async function seedRolePermissions({ prisma }: SeedContext): Promise<void> {
  const permissions = await prisma.permission.findMany();
  const templates = await prisma.systemRoleTemplate.findMany();
  const templateByKey = new Map(
    templates.map((template) => [template.roleKey.toUpperCase(), template]),
  );

  for (const [roleKey] of SYSTEM_ROLES) {
    const template = templateByKey.get(roleKey);
    if (!template) {
      throw new Error(`Missing role template ${roleKey}`);
    }
    const modules = roleModules[roleKey] ?? [];
    const allowed = permissions.filter(
      (permission) => modules.includes('*') || modules.includes(permission.module),
    );
    for (const permission of allowed) {
      await prisma.systemRolePermission.upsert({
        where: {
          roleTemplateId_permissionId: {
            roleTemplateId: template.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleTemplateId: template.id,
          permissionId: permission.id,
        },
      });
    }
  }
  console.log('007: seeded system role-permission mappings.');
}
