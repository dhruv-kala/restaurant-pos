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

export const MENU_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
];

export function requireMenuRole(user: AuthenticatedUser): void {
  requireRole(user, MENU_ROLES);
}

export function resolveMenuTenantId(
  requestedTenantId: string | undefined,
  user: AuthenticatedUser,
  requiredForPlatformAdmin: boolean,
): string | undefined {
  if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
    if (requiredForPlatformAdmin && requestedTenantId === undefined) {
      throw new BadRequestException(
        'tenantId is required for platform administrator writes',
      );
    }
    return requestedTenantId;
  }

  const tenantId = requireTenantId(user);
  if (requestedTenantId !== undefined && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant access is forbidden');
  }
  return tenantId;
}
