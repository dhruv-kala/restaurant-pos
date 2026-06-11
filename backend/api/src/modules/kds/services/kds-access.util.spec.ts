import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireKdsConfigure, requireKdsRead, requireKdsWrite } from './kds-access.util';

function user(role: string) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    tenantId: 'tenant-1',
    outletId: 'outlet-1',
    roles: [role],
  } as AuthenticatedUser;
}

describe('KDS access', () => {
  it('allows kitchen reads and updates but not configuration', () => {
    expect(() => requireKdsRead(user('KITCHEN_STAFF'))).not.toThrow();
    expect(() => requireKdsWrite(user('KITCHEN_STAFF'))).not.toThrow();
    expect(() => requireKdsConfigure(user('KITCHEN_STAFF'))).toThrow(ForbiddenException);
  });

  it('allows manager and waiter reads but denies updates', () => {
    expect(() => requireKdsRead(user('MANAGER'))).not.toThrow();
    expect(() => requireKdsRead(user('WAITER'))).not.toThrow();
    expect(() => requireKdsWrite(user('MANAGER'))).toThrow(ForbiddenException);
    expect(() => requireKdsWrite(user('WAITER'))).toThrow(ForbiddenException);
  });

  it('denies cashier access', () => {
    expect(() => requireKdsRead(user('CASHIER'))).toThrow(ForbiddenException);
  });
});
