import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export function resolveCommunicationTemplateTenant(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
): string {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException('tenantId is required for platform template access');
    }
    return requestedTenantId;
  }
  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant communication template access is forbidden');
  }
  return tenantId;
}

export function requireCommunicationTemplateView(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    actor.permissions?.includes('communication.template_view') ||
    actor.permissions?.includes('communication.template_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Communication template view permission is required');
}

export function requireCommunicationTemplateManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    actor.permissions?.includes('communication.template_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Communication template management permission is required');
}
