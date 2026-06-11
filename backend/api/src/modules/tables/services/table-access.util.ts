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

export const TABLE_READ_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'WAITER',
  'CASHIER',
];
export const TABLE_WRITE_ROLES = [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE, MANAGER_ROLE];

export function requireTableRead(user: AuthenticatedUser): void {
  requireRole(user, TABLE_READ_ROLES);
}

export function requireTableWrite(user: AuthenticatedUser): void {
  requireRole(user, TABLE_WRITE_ROLES);
}

export function resolveTableScope(
  requestedTenantId: string | undefined,
  requestedOutletId: string | undefined,
  user: AuthenticatedUser,
  requireOutlet: boolean,
): { tenantId?: string; outletId?: string } {
  if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
    if (requireOutlet && requestedOutletId === undefined) {
      throw new BadRequestException('outletId is required for platform administrator writes');
    }
    return { tenantId: requestedTenantId, outletId: requestedOutletId };
  }

  const tenantId = requireTenantId(user);
  if (requestedTenantId !== undefined && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant access is forbidden');
  }

  if (hasRole(user, TENANT_ADMIN_ROLE)) {
    if (requireOutlet && requestedOutletId === undefined) {
      throw new BadRequestException('outletId is required');
    }
    return { tenantId, outletId: requestedOutletId };
  }

  if (user.outletId === null) {
    throw new ForbiddenException('Outlet context is required');
  }
  if (requestedOutletId !== undefined && requestedOutletId !== user.outletId) {
    throw new ForbiddenException('Cross-outlet access is forbidden');
  }
  return { tenantId, outletId: user.outletId };
}
