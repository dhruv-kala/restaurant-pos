import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireCommunicationProviderManage,
  requireCommunicationProviderView,
  resolveCommunicationProviderTenant,
} from './communication-provider-access.util';

const actor = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: 'user-1',
  email: 'admin@example.com',
  name: 'Admin',
  tenantId: 'tenant-1',
  outletId: null,
  roles: [],
  permissions: [],
  ...overrides,
});

describe('communication provider access', () => {
  it('allows explicit provider permissions', () => {
    expect(() =>
      requireCommunicationProviderView(
        actor({ permissions: ['communication.provider_view'] }),
      ),
    ).not.toThrow();
    expect(() =>
      requireCommunicationProviderManage(
        actor({ permissions: ['communication.provider_manage'] }),
      ),
    ).not.toThrow();
  });

  it('rejects cross-tenant provider access', () => {
    expect(() => resolveCommunicationProviderTenant(actor(), 'tenant-2')).toThrow(
      ForbiddenException,
    );
  });

  it('requires an explicit tenant for platform access', () => {
    expect(() =>
      resolveCommunicationProviderTenant(
        actor({ tenantId: null, roles: ['SUPER_ADMIN'] }),
      ),
    ).toThrow(BadRequestException);
  });
});
