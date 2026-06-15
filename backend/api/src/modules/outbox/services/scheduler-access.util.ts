import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OutboxEventScope } from '@prisma/client';

import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export interface SchedulerScope {
  scope: OutboxEventScope;
  scopeKey: string;
  tenantId: string | null;
  outletId: string | null;
}

export interface SchedulerReadScope {
  tenantId?: string;
  outletId?: string;
  platformOnly: boolean;
}

export function requireSchedulerView(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'scheduler.view') ||
    hasPermission(actor, 'scheduler.manage') ||
    hasPermission(actor, 'jobs.view') ||
    hasPermission(actor, 'jobs.manage')
  ) {
    return;
  }
  throw new ForbiddenException('Scheduler view permission is required');
}

export function requireSchedulerManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasPermission(actor, 'scheduler.manage') ||
    hasPermission(actor, 'jobs.manage')
  ) {
    return;
  }
  throw new ForbiddenException('Scheduler management permission is required');
}

export function resolveSchedulerReadScope(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
  requestedOutletId?: string,
  requestedScope?: OutboxEventScope,
): SchedulerReadScope {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (requestedScope === OutboxEventScope.PLATFORM) {
      if (requestedTenantId || requestedOutletId) {
        throw new BadRequestException('Platform schedules cannot be tenant or outlet scoped');
      }
      return { platformOnly: true };
    }
    return {
      tenantId: requestedTenantId,
      outletId: requestedOutletId,
      platformOnly: false,
    };
  }
  if (requestedScope === OutboxEventScope.PLATFORM) {
    throw new ForbiddenException('Platform scheduler access is forbidden');
  }
  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant scheduler access is forbidden');
  }
  if (hasRole(actor, TENANT_ADMIN_ROLE) || hasPermission(actor, 'scheduler.manage')) {
    return { tenantId, outletId: requestedOutletId, platformOnly: false };
  }
  if (!actor.outletId) {
    throw new ForbiddenException('Outlet context is required for scheduler access');
  }
  if (requestedOutletId && requestedOutletId !== actor.outletId) {
    throw new ForbiddenException('Cross-outlet scheduler access is forbidden');
  }
  return { tenantId, outletId: actor.outletId, platformOnly: false };
}

export function resolveSchedulerWriteScope(
  actor: AuthenticatedUser,
  requestedScope: OutboxEventScope,
  requestedTenantId?: string | null,
  requestedOutletId?: string | null,
): SchedulerScope {
  if (requestedScope === OutboxEventScope.PLATFORM) {
    if (!hasRole(actor, PLATFORM_ADMIN_ROLE)) {
      throw new ForbiddenException('Platform schedule management is forbidden');
    }
    if (requestedTenantId || requestedOutletId) {
      throw new BadRequestException('Platform schedules cannot be tenant or outlet scoped');
    }
    return {
      scope: OutboxEventScope.PLATFORM,
      scopeKey: 'platform',
      tenantId: null,
      outletId: null,
    };
  }
  if (requestedScope !== OutboxEventScope.TENANT) {
    throw new BadRequestException('Unsupported scheduler scope');
  }
  const tenantId = hasRole(actor, PLATFORM_ADMIN_ROLE)
    ? requiredRequestedTenantId(requestedTenantId)
    : requireTenantId(actor);
  if (!hasRole(actor, PLATFORM_ADMIN_ROLE) && requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant scheduler management is forbidden');
  }
  return {
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId: requestedOutletId ?? null,
  };
}

function requiredRequestedTenantId(tenantId?: string | null): string {
  if (!tenantId) throw new BadRequestException('tenantId is required for tenant schedules');
  return tenantId;
}

function hasPermission(actor: AuthenticatedUser, permission: string): boolean {
  return actor.permissions?.includes('*') || actor.permissions?.includes(permission) || false;
}
