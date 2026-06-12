import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export interface NotificationScope {
  tenantId: string;
  outletId?: string;
}

export function resolveNotificationScope(
  user: AuthenticatedUser,
  requestedTenantId?: string,
  requestedOutletId?: string,
): NotificationScope {
  if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException('tenantId is required for platform notification access');
    }
    return { tenantId: requestedTenantId, outletId: requestedOutletId };
  }
  const tenantId = requireTenantId(user);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant notification access is forbidden');
  }
  if (hasRole(user, MANAGER_ROLE)) {
    if (!user.outletId) {
      throw new ForbiddenException('Manager outlet context is required');
    }
    if (requestedOutletId && requestedOutletId !== user.outletId) {
      throw new ForbiddenException('Managers can publish only within their outlet');
    }
    return { tenantId, outletId: user.outletId };
  }
  return { tenantId, outletId: requestedOutletId };
}

export function requireNotificationPublish(user: AuthenticatedUser): void {
  if (
    hasRole(user, PLATFORM_ADMIN_ROLE) ||
    hasRole(user, TENANT_ADMIN_ROLE) ||
    hasRole(user, MANAGER_ROLE) ||
    user.permissions?.includes('notifications.create') ||
    user.permissions?.includes('notifications.send')
  ) {
    return;
  }
  throw new ForbiddenException('Notification publish permission is required');
}

export function requireNotificationManage(user: AuthenticatedUser): void {
  if (
    hasRole(user, PLATFORM_ADMIN_ROLE) ||
    hasRole(user, TENANT_ADMIN_ROLE) ||
    hasRole(user, MANAGER_ROLE) ||
    user.permissions?.includes('notifications.manage')
  ) {
    return;
  }
  throw new ForbiddenException('Notification management permission is required');
}
