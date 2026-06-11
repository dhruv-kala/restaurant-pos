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
  'KITCHEN_STAFF',
  'WAITER',
  'CASHIER',
];
const WRITE_ROLES = [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE, MANAGER_ROLE, 'KITCHEN_STAFF'];
const CONFIGURE_ROLES = [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE, MANAGER_ROLE];

export const requireKitchenRead = (user: AuthenticatedUser): void => requireRole(user, READ_ROLES);
export const requireKitchenWrite = (user: AuthenticatedUser): void =>
  requireRole(user, WRITE_ROLES);
export const requireKitchenConfigure = (user: AuthenticatedUser): void =>
  requireRole(user, CONFIGURE_ROLES);
export const resolveKitchenScope = resolveOrderScope;
