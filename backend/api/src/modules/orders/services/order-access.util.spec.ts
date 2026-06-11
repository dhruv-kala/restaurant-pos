import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireOrderRead,
  requireOrderStatusWrite,
  requireOrderWrite,
  resolveOrderScope,
} from './order-access.util';

function user(role: string, outletId: string | null = 'outlet-1') {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    tenantId: 'tenant-1',
    outletId,
    roles: [role],
  } as AuthenticatedUser;
}

describe('order access', () => {
  it('allows kitchen reads and status changes but denies order writes', () => {
    const kitchen = user('KITCHEN_STAFF');
    expect(() => requireOrderRead(kitchen)).not.toThrow();
    expect(() => requireOrderStatusWrite(kitchen)).not.toThrow();
    expect(() => requireOrderWrite(kitchen)).toThrow(ForbiddenException);
  });

  it('allows waiter order writes in the assigned outlet', () => {
    const waiter = user('WAITER');
    expect(() => requireOrderWrite(waiter)).not.toThrow();
    expect(resolveOrderScope(undefined, undefined, waiter, true)).toEqual({
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
    });
  });

  it('denies customer and cross-outlet access', () => {
    expect(() => requireOrderRead(user('CUSTOMER'))).toThrow(ForbiddenException);
    expect(() => resolveOrderScope(undefined, 'outlet-2', user('CASHIER'), false)).toThrow(
      ForbiddenException,
    );
  });
});
