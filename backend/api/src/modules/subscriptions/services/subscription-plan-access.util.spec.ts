import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireSubscriptionPlanAdministration } from './subscription-plan-access.util';

function actor(roles: string[]): AuthenticatedUser {
  return {
    id: '01975c30-0000-7000-8000-000000000001',
    email: 'actor@example.com',
    name: 'Actor',
    tenantId: null,
    outletId: null,
    roles,
  };
}

describe('subscription plan access', () => {
  it('allows platform administrators', () => {
    expect(() => requireSubscriptionPlanAdministration(actor(['SUPER_ADMIN']))).not.toThrow();
  });

  it.each(['TENANT_ADMIN', 'MANAGER', 'CASHIER'])('rejects tenant role %s', (role) => {
    expect(() => requireSubscriptionPlanAdministration(actor([role]))).toThrow(ForbiddenException);
  });
});
