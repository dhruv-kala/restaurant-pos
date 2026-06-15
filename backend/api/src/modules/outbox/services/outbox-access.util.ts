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

export interface OutboxReadScope {
  tenantId?: string;
  outletId?: string;
  platformOnly: boolean;
}

export function requireOutboxView(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'jobs.view') ||
    hasPermission(actor, 'jobs.manage')
  ) {
    return;
  }
  throw new ForbiddenException('Job/outbox view permission is required');
}

export function requireJobRetry(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasPermission(actor, 'jobs.retry') ||
    hasPermission(actor, 'jobs.manage')
  ) {
    return;
  }
  throw new ForbiddenException('Job retry permission is required');
}

export function requireJobManage(actor: AuthenticatedUser): void {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE) || hasPermission(actor, 'jobs.manage')) {
    return;
  }
  throw new ForbiddenException('Job management permission is required');
}

export function requireDeadLetterManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasPermission(actor, 'jobs.dead_letter_manage') ||
    hasPermission(actor, 'jobs.manage')
  ) {
    return;
  }
  throw new ForbiddenException('Dead-letter management permission is required');
}

export function resolveOutboxReadScope(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
  requestedOutletId?: string,
  requestedScope?: OutboxEventScope,
): OutboxReadScope {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (requestedScope === OutboxEventScope.PLATFORM) {
      if (requestedTenantId || requestedOutletId) {
        throw new BadRequestException('Platform outbox events cannot be tenant or outlet scoped');
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
    throw new ForbiddenException('Platform outbox access is forbidden');
  }
  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant outbox access is forbidden');
  }
  if (hasRole(actor, TENANT_ADMIN_ROLE)) {
    return { tenantId, outletId: requestedOutletId, platformOnly: false };
  }
  if (!actor.outletId) {
    throw new ForbiddenException('Outlet context is required for outbox access');
  }
  if (requestedOutletId && requestedOutletId !== actor.outletId) {
    throw new ForbiddenException('Cross-outlet outbox access is forbidden');
  }
  return { tenantId, outletId: actor.outletId, platformOnly: false };
}

function hasPermission(actor: AuthenticatedUser, permission: string): boolean {
  return actor.permissions?.includes('*') || actor.permissions?.includes(permission) || false;
}
