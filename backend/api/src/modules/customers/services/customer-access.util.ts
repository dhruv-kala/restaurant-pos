import { ForbiddenException } from '@nestjs/common';
import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export const CUSTOMER_READ_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'CASHIER',
  'WAITER',
];
export const CUSTOMER_WRITE_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'CASHIER',
];
export const CUSTOMER_CREATE_ROLES = [...CUSTOMER_WRITE_ROLES, 'WAITER'];

export const requireCustomerRead = (user: AuthenticatedUser): void =>
  requireRole(user, CUSTOMER_READ_ROLES);
export const requireCustomerWrite = (user: AuthenticatedUser): void =>
  requireRole(user, CUSTOMER_WRITE_ROLES);
export const requireCustomerCreate = (user: AuthenticatedUser): void =>
  requireRole(user, CUSTOMER_CREATE_ROLES);

export function resolveCustomerScope(
  tenantId: string | undefined,
  outletId: string | undefined,
  user: AuthenticatedUser,
): { tenantId?: string; outletId?: string } {
  if (hasRole(user, PLATFORM_ADMIN_ROLE)) return { tenantId, outletId };
  const trustedTenantId = requireTenantId(user);
  if (tenantId && tenantId !== trustedTenantId) {
    throw new ForbiddenException('Cross-tenant access is forbidden');
  }
  if (hasRole(user, TENANT_ADMIN_ROLE)) {
    return { tenantId: trustedTenantId, outletId };
  }
  if (!user.outletId) throw new ForbiddenException('Outlet context is required');
  if (outletId && outletId !== user.outletId) {
    throw new ForbiddenException('Cross-outlet access is forbidden');
  }
  return { tenantId: trustedTenantId, outletId: user.outletId };
}
