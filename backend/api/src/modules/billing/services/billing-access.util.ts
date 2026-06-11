import {
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { resolveOrderScope } from '../../orders/services/order-access.util';

export const BILLING_READ_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'CASHIER',
  'WAITER',
];
export const BILLING_WRITE_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'CASHIER',
];

export const requireBillingRead = (user: AuthenticatedUser): void =>
  requireRole(user, BILLING_READ_ROLES);
export const requireBillingWrite = (user: AuthenticatedUser): void =>
  requireRole(user, BILLING_WRITE_ROLES);
export const resolveBillingScope = resolveOrderScope;
