import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export interface BusinessDayScope {
  tenantId: string;
}

export function resolveBusinessDayScope(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
): BusinessDayScope {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException('tenantId is required for platform business day access');
    }
    return { tenantId: requestedTenantId };
  }

  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant business day access is forbidden');
  }
  return { tenantId };
}

export function assertOutletAccess(actor: AuthenticatedUser, outletId: string): void {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE) || hasRole(actor, TENANT_ADMIN_ROLE)) {
    return;
  }
  if (actor.outletId !== null && actor.outletId === outletId) {
    return;
  }
  throw new ForbiddenException('Outlet business day access is forbidden');
}

export function requireBusinessDayRead(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'business_day.read') ||
    hasPermission(actor, 'business_day.open') ||
    hasPermission(actor, 'business_day.close')
  ) {
    return;
  }
  throw new ForbiddenException('Business day read permission is required');
}

export function requireBusinessDayOpen(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'business_day.open')
  ) {
    return;
  }
  throw new ForbiddenException('Business day open permission is required');
}

export function requireBusinessDayClose(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'business_day.close')
  ) {
    return;
  }
  throw new ForbiddenException('Business day close permission is required');
}

function hasPermission(actor: AuthenticatedUser, permission: string): boolean {
  return actor.permissions?.includes('*') || actor.permissions?.includes(permission) || false;
}
