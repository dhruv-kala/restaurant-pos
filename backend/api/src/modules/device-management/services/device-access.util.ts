import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export interface DeviceScope {
  tenantId?: string;
}

export function resolveDeviceReadScope(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
): DeviceScope {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    return { tenantId: requestedTenantId };
  }

  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant device access is forbidden');
  }
  return { tenantId };
}

export function resolveDeviceWriteScope(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
): { tenantId: string } {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException('tenantId is required for platform device access');
    }
    return { tenantId: requestedTenantId };
  }

  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant device access is forbidden');
  }
  return { tenantId };
}

export function requireDeviceRead(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'devices.read') ||
    hasPermission(actor, 'devices.register') ||
    hasPermission(actor, 'devices.update_status')
  ) {
    return;
  }
  throw new ForbiddenException('Device read permission is required');
}

export function requireDeviceRegister(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'devices.register')
  ) {
    return;
  }
  throw new ForbiddenException('Device registration permission is required');
}

export function requireDeviceStatusUpdate(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'devices.update_status')
  ) {
    return;
  }
  throw new ForbiddenException('Device status update permission is required');
}

export function assertOutletAccess(actor: AuthenticatedUser, outletId: string | null): void {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE) || hasRole(actor, TENANT_ADMIN_ROLE)) {
    return;
  }
  if (outletId !== null && actor.outletId !== null && actor.outletId === outletId) {
    return;
  }
  throw new ForbiddenException('Outlet device access is forbidden');
}

export function constrainOutletForActor(
  actor: AuthenticatedUser,
  requestedOutletId?: string,
): string | undefined {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE) || hasRole(actor, TENANT_ADMIN_ROLE)) {
    return requestedOutletId;
  }
  if (!actor.outletId) {
    throw new ForbiddenException('Outlet device access is forbidden');
  }
  if (requestedOutletId && requestedOutletId !== actor.outletId) {
    throw new ForbiddenException('Outlet device access is forbidden');
  }
  return actor.outletId;
}

function hasPermission(actor: AuthenticatedUser, permission: string): boolean {
  return actor.permissions?.includes('*') || actor.permissions?.includes(permission) || false;
}
