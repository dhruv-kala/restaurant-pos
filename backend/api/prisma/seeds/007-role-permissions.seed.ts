import { SeedContext } from './seed-context';
import { SYSTEM_ROLES } from './005-roles.seed';

const roleModules: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: [
    'outlets',
    'users',
    'roles',
    'menu',
    'tables',
    'orders',
    'kitchen',
    'billing',
    'payments',
    'receipts',
    'inventory',
    'purchasing',
    'recipes',
    'customers',
    'reports',
    'employees',
    'shifts',
    'attendance',
    'loyalty',
    'promotions',
    'tax',
    'fiscal_policy',
    'business_day',
    'cash_drawer',
    'shift_reconciliation',
    'devices',
    'settings',
    'audit',
    'notifications',
    'communication',
  ],
  MANAGER: [
    'menu',
    'tables',
    'orders',
    'kitchen',
    'billing',
    'payments',
    'receipts',
    'inventory',
    'purchasing',
    'recipes',
    'customers',
    'reports',
    'employees',
    'shifts',
    'attendance',
    'notifications',
    'communication',
    'promotions',
    'tax',
    'fiscal_policy',
    'business_day',
    'cash_drawer',
    'shift_reconciliation',
    'devices',
  ],
  CASHIER: [
    'billing',
    'payments',
    'receipts',
    'customers',
    'orders',
    'tables',
    'shifts',
    'cash_drawer',
    'shift_reconciliation',
    'notifications',
    'promotions',
  ],
  WAITER: ['orders', 'tables', 'menu', 'customers', 'notifications', 'promotions'],
  KITCHEN_STAFF: ['kitchen', 'orders', 'menu', 'inventory', 'notifications'],
  INVENTORY_MANAGER: ['inventory', 'purchasing', 'recipes', 'reports', 'notifications'],
  HR_MANAGER: ['employees', 'shifts', 'attendance', 'reports', 'users', 'notifications'],
  CUSTOMER: ['menu', 'orders', 'receipts', 'loyalty', 'notifications'],
};

const notificationActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: ['read', 'create', 'manage', 'send', 'preferences', 'outlet', 'user'],
  CASHIER: ['read', 'preferences'],
  WAITER: ['read', 'preferences'],
  KITCHEN_STAFF: ['read', 'preferences'],
  INVENTORY_MANAGER: ['read', 'preferences'],
  HR_MANAGER: ['read', 'preferences'],
  CUSTOMER: ['read', 'preferences'],
};

const communicationActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: ['history_view'],
};

const promotionActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: [
    'read',
    'policy_manage',
    'apply_discount',
    'override_discount',
    'coupon_view',
    'coupon_manage',
    'coupon_validate',
    'campaign_view',
    'campaign_manage',
    'eligibility_evaluate',
    'redemption_view',
    'redemption_create',
  ],
  CASHIER: [
    'read',
    'apply_discount',
    'coupon_view',
    'coupon_validate',
    'campaign_view',
    'eligibility_evaluate',
    'redemption_view',
    'redemption_create',
  ],
  WAITER: [
    'read',
    'coupon_view',
    'coupon_validate',
    'campaign_view',
    'eligibility_evaluate',
    'redemption_view',
    'redemption_create',
  ],
};

const taxActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: ['read'],
};

const fiscalPolicyActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: ['read'],
};

const shiftActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: ['*'],
  CASHIER: ['read', 'open', 'close'],
};

const cashDrawerActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: ['*'],
  CASHIER: ['read', 'open', 'adjust', 'close'],
};

const shiftReconciliationActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: ['*'],
  CASHIER: ['read', 'create'],
};

const deviceActions: Record<string, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  MANAGER: ['read', 'register', 'update_status', 'enroll', 'activate', 'manage_sessions'],
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
    const allowedNotificationActions = notificationActions[roleKey] ?? [];
    const allowedCommunicationActions = communicationActions[roleKey] ?? [];
    const allowedPromotionActions = promotionActions[roleKey] ?? [];
    const allowedTaxActions = taxActions[roleKey] ?? [];
    const allowedFiscalPolicyActions = fiscalPolicyActions[roleKey] ?? [];
    const allowedShiftActions = shiftActions[roleKey] ?? [];
    const allowedCashDrawerActions = cashDrawerActions[roleKey] ?? [];
    const allowedShiftReconciliationActions = shiftReconciliationActions[roleKey] ?? [];
    const allowedDeviceActions = deviceActions[roleKey] ?? [];
    const allowed = permissions.filter(
      (permission) =>
        (modules.includes('*') || modules.includes(permission.module)) &&
        (permission.module !== 'notifications' ||
          allowedNotificationActions.includes('*') ||
          allowedNotificationActions.includes(permission.action)) &&
        (permission.module !== 'communication' ||
          allowedCommunicationActions.includes('*') ||
          allowedCommunicationActions.includes(permission.action)) &&
        (permission.module !== 'promotions' ||
          allowedPromotionActions.includes('*') ||
          allowedPromotionActions.includes(permission.action)) &&
        (permission.module !== 'tax' ||
          allowedTaxActions.includes('*') ||
          allowedTaxActions.includes(permission.action)) &&
        (permission.module !== 'fiscal_policy' ||
          allowedFiscalPolicyActions.includes('*') ||
          allowedFiscalPolicyActions.includes(permission.action)) &&
        (permission.module !== 'shifts' ||
          allowedShiftActions.includes('*') ||
          allowedShiftActions.includes(permission.action)) &&
        (permission.module !== 'cash_drawer' ||
          allowedCashDrawerActions.includes('*') ||
          allowedCashDrawerActions.includes(permission.action)) &&
        (permission.module !== 'shift_reconciliation' ||
          allowedShiftReconciliationActions.includes('*') ||
          allowedShiftReconciliationActions.includes(permission.action)) &&
        (permission.module !== 'devices' ||
          allowedDeviceActions.includes('*') ||
          allowedDeviceActions.includes(permission.action)),
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
