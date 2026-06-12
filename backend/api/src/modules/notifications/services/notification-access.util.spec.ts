import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireNotificationPublish, resolveNotificationScope } from './notification-access.util';

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'user@example.test',
    name: 'User',
    tenantId: 'tenant-1',
    outletId: 'outlet-1',
    roles: ['WAITER'],
    permissions: ['notifications.read', 'notifications.preferences'],
    ...overrides,
  };
}

describe('notification access', () => {
  it('requires a tenant selection from platform administrators', () => {
    expect(() =>
      resolveNotificationScope(actor({ tenantId: null, roles: ['SUPER_ADMIN'] })),
    ).toThrow(BadRequestException);
  });

  it('locks managers to their authenticated outlet', () => {
    expect(() =>
      resolveNotificationScope(actor({ roles: ['MANAGER'] }), 'tenant-1', 'outlet-2'),
    ).toThrow(ForbiddenException);
  });

  it('does not grant publish rights from inbox permissions', () => {
    expect(() => requireNotificationPublish(actor())).toThrow(ForbiddenException);
  });

  it('allows managers to publish', () => {
    expect(() => requireNotificationPublish(actor({ roles: ['MANAGER'] }))).not.toThrow();
  });
});
