import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  managerOutletId,
  requireRbacRead,
  requireRbacWrite,
  resolveRbacTenantId,
} from './rbac-access.util';

const user = (
  roles: string[],
  tenantId: string | null = '00000000-0000-4000-8000-000000000001',
  outletId: string | null = '00000000-0000-4000-8000-000000000002',
): AuthenticatedUser => ({
  id: '00000000-0000-4000-8000-000000000003',
  email: 'actor@example.com',
  name: 'Actor',
  tenantId,
  outletId,
  roles,
});

describe('RBAC access rules', () => {
  it.each(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'])('allows %s to read RBAC data', (role) => {
    expect(() => requireRbacRead(user([role]))).not.toThrow();
  });

  it.each(['SUPER_ADMIN', 'TENANT_ADMIN'])('allows %s to mutate RBAC data', (role) => {
    expect(() => requireRbacWrite(user([role]))).not.toThrow();
  });

  it('denies operational roles and manager writes', () => {
    expect(() => requireRbacRead(user(['CASHIER']))).toThrow(ForbiddenException);
    expect(() => requireRbacWrite(user(['MANAGER']))).toThrow(ForbiddenException);
  });

  it('uses trusted tenant scope and rejects cross-tenant requests', () => {
    const actor = user(['TENANT_ADMIN']);
    expect(resolveRbacTenantId(undefined, actor)).toBe(actor.tenantId);
    expect(() => resolveRbacTenantId('00000000-0000-4000-8000-000000000099', actor)).toThrow(
      ForbiddenException,
    );
  });

  it('requires explicit tenant scope for platform administration', () => {
    expect(() => resolveRbacTenantId(undefined, user(['SUPER_ADMIN'], null, null))).toThrow(
      BadRequestException,
    );
  });

  it('requires manager outlet context', () => {
    expect(managerOutletId(user(['MANAGER']))).toBe('00000000-0000-4000-8000-000000000002');
    expect(() => managerOutletId(user(['MANAGER'], undefined, null))).toThrow(ForbiddenException);
  });
});
