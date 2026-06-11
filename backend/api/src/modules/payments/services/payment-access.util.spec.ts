import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requirePaymentRead, requirePaymentWrite } from './payment-access.util';

const user = (roles: string[]): AuthenticatedUser => ({
  id: '01900000-0000-7000-8000-000000000001',
  email: 'user@example.com',
  name: 'User',
  tenantId: '01900000-0000-7000-8000-000000000002',
  outletId: '01900000-0000-7000-8000-000000000003',
  roles,
});

describe('payment access', () => {
  it.each(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'CASHIER'])(
    'allows %s to write',
    (role) => expect(() => requirePaymentWrite(user([role]))).not.toThrow(),
  );

  it('allows waiters to read only', () => {
    expect(() => requirePaymentRead(user(['WAITER']))).not.toThrow();
    expect(() => requirePaymentWrite(user(['WAITER']))).toThrow(ForbiddenException);
  });

  it('denies kitchen staff', () => {
    expect(() => requirePaymentRead(user(['KITCHEN_STAFF']))).toThrow(ForbiddenException);
  });
});
