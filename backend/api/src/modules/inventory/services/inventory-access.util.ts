import {
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { resolveOrderScope } from '../../orders/services/order-access.util';

const READ_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'INVENTORY_MANAGER',
  'KITCHEN_STAFF',
];
const WRITE_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'INVENTORY_MANAGER',
];

export const requireInventoryRead = (user: AuthenticatedUser): void =>
  requireRole(user, READ_ROLES);
export const requireInventoryWrite = (user: AuthenticatedUser): void =>
  requireRole(user, WRITE_ROLES);
export const resolveInventoryScope = resolveOrderScope;
