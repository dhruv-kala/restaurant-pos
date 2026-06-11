import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireTableRead,
  requireTableWrite,
  resolveTableScope,
} from './table-access.util';

function user(role: string, outletId: string | null = 'outlet-1') {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    tenantId: 'tenant-1',
    outletId,
    roles: [role],
    isPlatformAdmin: false,
  } as AuthenticatedUser;
}

describe('table access', () => {
  it('allows waiter reads but denies waiter writes', () => {
    const waiter = user('WAITER');
    expect(() => requireTableRead(waiter)).not.toThrow();
    expect(() => requireTableWrite(waiter)).toThrow(ForbiddenException);
  });

  it('denies kitchen access', () => {
    const kitchen = user('KITCHEN_STAFF');
    expect(() => requireTableRead(kitchen)).toThrow(ForbiddenException);
  });

  it('locks operational users to their authenticated outlet', () => {
    const manager = user('MANAGER');
    expect(resolveTableScope(undefined, undefined, manager, true)).toEqual({
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
    });
    expect(() =>
      resolveTableScope(undefined, 'outlet-2', manager, false),
    ).toThrow(ForbiddenException);
  });
});
