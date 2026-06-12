import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export function resolveAuditScope(
  user: AuthenticatedUser,
  requestedTenantId?: string,
  requestedOutletId?: string,
): { tenantId: string | undefined; outletId: string | undefined } {
  requireAuditRead(user);
  if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
    return { tenantId: requestedTenantId, outletId: requestedOutletId };
  }
  const tenantId = requireTenantId(user);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant audit access is forbidden');
  }
  if (hasRole(user, MANAGER_ROLE)) {
    if (!user.outletId) {
      throw new ForbiddenException('Manager outlet context is required');
    }
    if (requestedOutletId && requestedOutletId !== user.outletId) {
      throw new ForbiddenException('Managers can view only their outlet audit');
    }
    return { tenantId, outletId: user.outletId };
  }
  return { tenantId, outletId: requestedOutletId };
}

export function requireAuditRead(user: AuthenticatedUser): void {
  if (
    hasRole(user, PLATFORM_ADMIN_ROLE) ||
    hasRole(user, TENANT_ADMIN_ROLE) ||
    user.permissions?.includes('audit.read')
  ) {
    return;
  }
  throw new ForbiddenException('Audit read permission is required');
}

export function requireAuditExport(user: AuthenticatedUser): void {
  if (
    hasRole(user, PLATFORM_ADMIN_ROLE) ||
    hasRole(user, TENANT_ADMIN_ROLE) ||
    user.permissions?.includes('audit.export')
  ) {
    return;
  }
  throw new ForbiddenException('Audit export permission is required');
}

export function requirePlatformTenantForExport(user: AuthenticatedUser, tenantId?: string): void {
  if (hasRole(user, PLATFORM_ADMIN_ROLE) && !tenantId) {
    throw new BadRequestException(
      'tenantId is required for tenant audit export; platform events use the platform audit view',
    );
  }
}
