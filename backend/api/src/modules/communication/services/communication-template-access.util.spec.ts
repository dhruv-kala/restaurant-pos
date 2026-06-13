import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireCommunicationTemplateManage,
  requireCommunicationTemplateView,
  resolveCommunicationTemplateTenant,
} from './communication-template-access.util';

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

describe('communication template access', () => {
  it('requires platform administrators to select a tenant', () => {
    expect(() =>
      resolveCommunicationTemplateTenant(actor({ tenantId: null, roles: ['SUPER_ADMIN'] })),
    ).toThrow(BadRequestException);
  });

  it('rejects cross-tenant access', () => {
    expect(() => resolveCommunicationTemplateTenant(actor(), 'tenant-2')).toThrow(
      ForbiddenException,
    );
  });

  it('allows explicit view permission without management permission', () => {
    const viewer = actor({ permissions: ['communication.template_view'] });
    expect(() => requireCommunicationTemplateView(viewer)).not.toThrow();
    expect(() => requireCommunicationTemplateManage(viewer)).toThrow(ForbiddenException);
  });

  it('allows tenant administrators to manage templates', () => {
    expect(() =>
      requireCommunicationTemplateManage(actor({ roles: ['TENANT_ADMIN'] })),
    ).not.toThrow();
  });
});
