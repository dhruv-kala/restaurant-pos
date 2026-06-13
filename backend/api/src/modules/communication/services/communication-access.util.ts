import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export interface CommunicationScope {
  tenantId: string;
  outletId?: string;
}

export function resolveCommunicationScope(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
  requestedOutletId?: string,
): CommunicationScope {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException('tenantId is required for platform communication access');
    }
    return { tenantId: requestedTenantId, outletId: requestedOutletId };
  }
  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant communication access is forbidden');
  }
  if (hasRole(actor, TENANT_ADMIN_ROLE)) {
    return { tenantId, outletId: requestedOutletId };
  }
  if (!actor.outletId) {
    throw new ForbiddenException('Outlet context is required for communication access');
  }
  if (requestedOutletId && requestedOutletId !== actor.outletId) {
    throw new ForbiddenException('Cross-outlet communication access is forbidden');
  }
  return { tenantId, outletId: actor.outletId };
}

export function requireCommunicationHistoryView(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    actor.permissions?.includes('communication.history_view')
  ) {
    return;
  }
  throw new ForbiddenException('Communication history permission is required');
}

export function requireCommunicationSend(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    actor.permissions?.includes('communication.send')
  ) {
    return;
  }
  throw new ForbiddenException('Communication send permission is required');
}
