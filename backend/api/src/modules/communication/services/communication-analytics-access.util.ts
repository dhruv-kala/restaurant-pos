import { ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export function requireCommunicationAnalyticsView(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    actor.permissions?.includes('communication.analytics_view')
  ) {
    return;
  }
  throw new ForbiddenException('Communication analytics permission is required');
}
