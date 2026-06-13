import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireCommunicationHistoryView,
  requireCommunicationSend,
  resolveCommunicationScope,
} from './communication-access.util';

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'user@example.test',
    name: 'User',
    tenantId: 'tenant-1',
    outletId: 'outlet-1',
    roles: ['WAITER'],
    permissions: [],
    ...overrides,
  };
}

describe('communication access', () => {
  it('requires a tenant selection for platform access', () => {
    expect(() =>
      resolveCommunicationScope(actor({ tenantId: null, roles: ['SUPER_ADMIN'] })),
    ).toThrow(BadRequestException);
  });

  it('locks managers to their authenticated outlet', () => {
    expect(() =>
      resolveCommunicationScope(actor({ roles: ['MANAGER'] }), 'tenant-1', 'outlet-2'),
    ).toThrow(ForbiddenException);
  });

  it('allows managers to view history but not execute delivery', () => {
    const manager = actor({ roles: ['MANAGER'] });
    expect(() => requireCommunicationHistoryView(manager)).not.toThrow();
    expect(() => requireCommunicationSend(manager)).toThrow(ForbiddenException);
  });

  it('allows explicit send permission', () => {
    expect(() =>
      requireCommunicationSend(actor({ permissions: ['communication.send'] })),
    ).not.toThrow();
  });
});
