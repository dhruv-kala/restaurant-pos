import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireCommunicationAnalyticsView } from './communication-analytics-access.util';

const actor = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
  tenantId: 'tenant-1',
  outletId: null,
  roles: [],
  permissions: [],
  ...overrides,
});

describe('communication analytics access', () => {
  it('allows tenant administrators and explicit analytics viewers', () => {
    expect(() =>
      requireCommunicationAnalyticsView(actor({ roles: ['TENANT_ADMIN'] })),
    ).not.toThrow();
    expect(() =>
      requireCommunicationAnalyticsView(
        actor({ permissions: ['communication.analytics_view'] }),
      ),
    ).not.toThrow();
  });

  it('rejects communication history viewers without analytics permission', () => {
    expect(() =>
      requireCommunicationAnalyticsView(
        actor({ permissions: ['communication.history_view'] }),
      ),
    ).toThrow(ForbiddenException);
  });
});
