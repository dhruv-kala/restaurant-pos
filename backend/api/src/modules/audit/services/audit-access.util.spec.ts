import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { resolveAuditScope } from './audit-access.util';

const manager: AuthenticatedUser = {
  id: 'user',
  email: 'manager@example.test',
  name: 'Manager',
  tenantId: 'tenant',
  outletId: 'outlet-a',
  roles: ['MANAGER'],
  permissions: ['audit.read'],
};

describe('audit access', () => {
  it('forces managers to their authenticated outlet', () => {
    expect(resolveAuditScope(manager)).toEqual({
      tenantId: 'tenant',
      outletId: 'outlet-a',
    });
    expect(() => resolveAuditScope(manager, 'tenant', 'outlet-b')).toThrow(ForbiddenException);
  });

  it('allows platform administrators to select cross-tenant scope', () => {
    expect(
      resolveAuditScope(
        { ...manager, tenantId: null, outletId: null, roles: ['SUPER_ADMIN'] },
        'tenant-b',
        'outlet-b',
      ),
    ).toEqual({ tenantId: 'tenant-b', outletId: 'outlet-b' });
  });
});
