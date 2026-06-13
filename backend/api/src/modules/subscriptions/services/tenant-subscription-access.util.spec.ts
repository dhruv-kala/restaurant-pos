import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireTenantSubscriptionMutation,
  resolveTenantSubscriptionReadScope,
} from './tenant-subscription-access.util';

const tenantId = '01975c30-0000-7000-8000-000000000100';

function actor(roles: string[], scopedTenantId: string | null): AuthenticatedUser {
  return {
    id: '01975c30-0000-7000-8000-000000000001',
    email: 'actor@example.com',
    name: 'Actor',
    tenantId: scopedTenantId,
    outletId: null,
    roles,
  };
}

describe('tenant subscription access', () => {
  it('allows only platform administrators to mutate subscriptions', () => {
    expect(() => requireTenantSubscriptionMutation(actor(['SUPER_ADMIN'], null))).not.toThrow();
    expect(() => requireTenantSubscriptionMutation(actor(['TENANT_ADMIN'], tenantId))).toThrow(
      ForbiddenException,
    );
  });

  it('allows tenant administrators to read only their tenant', () => {
    const tenantAdmin = actor(['TENANT_ADMIN'], tenantId);
    expect(resolveTenantSubscriptionReadScope(tenantAdmin, tenantId)).toBe(tenantId);
    expect(() =>
      resolveTenantSubscriptionReadScope(tenantAdmin, '01975c30-0000-7000-8000-000000000101'),
    ).toThrow(ForbiddenException);
  });

  it('allows platform administrators to select a tenant', () => {
    expect(resolveTenantSubscriptionReadScope(actor(['SUPER_ADMIN'], null), tenantId)).toBe(
      tenantId,
    );
  });
});
