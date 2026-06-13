import { ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export function requireTenantSubscriptionMutation(actor: AuthenticatedUser): void {
  if (!hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    throw new ForbiddenException('Subscription lifecycle administration requires platform access');
  }
}

export function resolveTenantSubscriptionReadScope(
  actor: AuthenticatedUser,
  requestedTenantId: string,
): string {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    return requestedTenantId;
  }
  if (!hasRole(actor, TENANT_ADMIN_ROLE)) {
    throw new ForbiddenException('Subscription details require tenant administrator access');
  }
  const tenantId = requireTenantId(actor);
  if (tenantId !== requestedTenantId) {
    throw new ForbiddenException('Cross-tenant subscription access is forbidden');
  }
  return tenantId;
}
