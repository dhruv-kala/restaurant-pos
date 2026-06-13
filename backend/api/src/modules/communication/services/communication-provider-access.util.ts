import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export function resolveCommunicationProviderTenant(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
): string {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException('tenantId is required for platform provider access');
    }
    return requestedTenantId;
  }
  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant communication provider access is forbidden');
  }
  return tenantId;
}

export function requireCommunicationProviderView(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    actor.permissions?.includes('communication.provider_view') ||
    actor.permissions?.includes('communication.provider_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Communication provider view permission is required');
}

export function requireCommunicationProviderManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    actor.permissions?.includes('communication.provider_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Communication provider management permission is required');
}
