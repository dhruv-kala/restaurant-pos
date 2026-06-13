import { ForbiddenException } from '@nestjs/common';

import { PLATFORM_ADMIN_ROLE } from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export function requireSubscriptionPlanAdministration(actor: AuthenticatedUser): void {
  if (!actor.roles.includes(PLATFORM_ADMIN_ROLE)) {
    throw new ForbiddenException('Subscription plan administration requires platform access');
  }
}
