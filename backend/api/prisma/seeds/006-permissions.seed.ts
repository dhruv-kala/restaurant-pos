import { SeedContext } from './seed-context';

const moduleActions: Record<string, readonly string[]> = {
  tenants: ['create', 'read', 'update', 'suspend', 'activate', 'close', 'impersonate', 'configure'],
  outlets: ['create', 'read', 'update', 'archive', 'activate', 'configure', 'assign', 'transfer'],
  users: [
    'invite',
    'read',
    'update',
    'revoke',
    'activate',
    'suspend',
    'reset_password',
    'assign_outlet',
  ],
  roles: ['create', 'read', 'update', 'delete', 'assign', 'grant', 'revoke', 'audit'],
  menu: [
    'create',
    'read',
    'update',
    'delete',
    'price',
    'publish',
    'availability',
    'assign_station',
  ],
  tables: ['create', 'read', 'update', 'delete', 'reserve', 'merge', 'split', 'transfer'],
  orders: ['create', 'read', 'update', 'cancel', 'complete', 'transfer', 'discount', 'reopen'],
  kitchen: ['read', 'update', 'configure', 'route', 'prioritize', 'recall', 'metrics', 'override'],
  billing: ['create', 'read', 'update', 'void', 'split', 'merge', 'print', 'reprint'],
  payments: [
    'create',
    'read',
    'update',
    'refund',
    'approve_refund',
    'reconcile',
    'settle',
    'export',
  ],
  receipts: ['create', 'read', 'print', 'reprint', 'email', 'download', 'void', 'configure'],
  inventory: ['create', 'read', 'update', 'adjust', 'transfer', 'receive', 'consume', 'wastage'],
  purchasing: [
    'create',
    'read',
    'update',
    'approve',
    'cancel',
    'receive',
    'close',
    'vendor_manage',
  ],
  recipes: ['create', 'read', 'update', 'delete', 'cost', 'publish', 'consume', 'produce'],
  customers: ['create', 'read', 'update', 'delete', 'notes', 'history', 'export', 'merge'],
  reports: ['read', 'sales', 'tax', 'payment', 'inventory', 'kitchen', 'staff', 'export'],
  employees: [
    'create',
    'read',
    'update',
    'terminate',
    'salary',
    'performance',
    'assign_role',
    'assign_outlet',
  ],
  shifts: ['create', 'read', 'update', 'delete', 'assign', 'unassign', 'publish', 'close'],
  attendance: [
    'read',
    'check_in',
    'check_out',
    'correct',
    'approve',
    'export',
    'configure',
    'audit',
  ],
  loyalty: ['create', 'read', 'update', 'earn', 'redeem', 'adjust', 'expire', 'configure'],
  subscriptions: [
    'create',
    'read',
    'update',
    'cancel',
    'renew',
    'invoice',
    'plan_manage',
    'module_manage',
  ],
  settings: ['read', 'update', 'tax', 'receipt', 'inventory', 'order', 'kitchen', 'security'],
  audit: [
    'read',
    'export',
    'user_activity',
    'financial',
    'inventory',
    'security',
    'retention',
    'configure',
  ],
  notifications: ['read', 'create', 'manage', 'send', 'preferences', 'tenant', 'outlet', 'user'],
  communication: ['template_view', 'template_manage', 'history_view', 'send'],
};

export const PERMISSIONS = Object.entries(moduleActions).flatMap(([module, actions]) =>
  actions.map((action) => ({
    permissionKey: `${module}.${action}`,
    module,
    action,
    description: `${action.replaceAll('_', ' ')} ${module}`,
  })),
);

export async function seedPermissions({ prisma }: SeedContext): Promise<void> {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { permissionKey: permission.permissionKey },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
        isActive: true,
      },
      create: permission,
    });
  }
  console.log(`006: seeded ${PERMISSIONS.length} granular permissions.`);
}
