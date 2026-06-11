import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireBillingRead, requireBillingWrite } from './billing-access.util';

const user = (roles: string[]): AuthenticatedUser => ({
  id: '01900000-0000-7000-8000-000000000001',
  email: 'user@example.com',
  name: 'User',
  tenantId: '01900000-0000-7000-8000-000000000002',
  outletId: '01900000-0000-7000-8000-000000000003',
  roles,
});

describe('billing access', () => {
  it.each(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'CASHIER'])(
    'allows %s to write',
    (role) => expect(() => requireBillingWrite(user([role]))).not.toThrow(),
  );

  it('allows waiters to read but not write', () => {
    expect(() => requireBillingRead(user(['WAITER']))).not.toThrow();
    expect(() => requireBillingWrite(user(['WAITER']))).toThrow(ForbiddenException);
  });

  it('denies kitchen staff', () => {
    expect(() => requireBillingRead(user(['KITCHEN_STAFF']))).toThrow(ForbiddenException);
    expect(() => requireBillingWrite(user(['KITCHEN_STAFF']))).toThrow(ForbiddenException);
  });
});
