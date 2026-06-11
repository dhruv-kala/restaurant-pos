import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export const ORDER_READ_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'WAITER',
  'CASHIER',
  'KITCHEN_STAFF',
];
export const ORDER_WRITE_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'WAITER',
  'CASHIER',
];

export const requireOrderRead = (user: AuthenticatedUser): void =>
  requireRole(user, ORDER_READ_ROLES);
export const requireOrderWrite = (user: AuthenticatedUser): void =>
  requireRole(user, ORDER_WRITE_ROLES);
export const requireOrderStatusWrite = (user: AuthenticatedUser): void =>
  requireRole(user, ORDER_READ_ROLES);

export function resolveOrderScope(
  tenantId: string | undefined,
  outletId: string | undefined,
  user: AuthenticatedUser,
  requireOutlet: boolean,
): { tenantId?: string; outletId?: string } {
  if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
    if (requireOutlet && outletId === undefined) {
      throw new BadRequestException('outletId is required');
    }
    return { tenantId, outletId };
  }
  const trustedTenantId = requireTenantId(user);
  if (tenantId !== undefined && tenantId !== trustedTenantId) {
    throw new ForbiddenException('Cross-tenant access is forbidden');
  }
  if (hasRole(user, TENANT_ADMIN_ROLE)) {
    if (requireOutlet && outletId === undefined) {
      throw new BadRequestException('outletId is required');
    }
    return { tenantId: trustedTenantId, outletId };
  }
  if (user.outletId === null) {
    throw new ForbiddenException('Outlet context is required');
  }
  if (outletId !== undefined && outletId !== user.outletId) {
    throw new ForbiddenException('Cross-outlet access is forbidden');
  }
  return { tenantId: trustedTenantId, outletId: user.outletId };
}
