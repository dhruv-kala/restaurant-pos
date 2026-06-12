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

export function requireRbacRead(user: AuthenticatedUser): void {
  requireRole(user, [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE, MANAGER_ROLE]);
}

export function requireRbacWrite(user: AuthenticatedUser): void {
  requireRole(user, [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE]);
}

export function resolveRbacTenantId(
  requestedTenantId: string | undefined,
  user: AuthenticatedUser,
): string {
  if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException(
        'tenantId is required for platform administration',
      );
    }
    return requestedTenantId;
  }
  const tenantId = requireTenantId(user);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant access is forbidden');
  }
  return tenantId;
}

export function managerOutletId(user: AuthenticatedUser): string | undefined {
  if (!hasRole(user, MANAGER_ROLE)) {
    return undefined;
  }
  if (!user.outletId) {
    throw new ForbiddenException('Manager outlet context is required');
  }
  return user.outletId;
}
