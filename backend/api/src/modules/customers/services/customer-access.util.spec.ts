import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireCustomerCreate,
  requireCustomerRead,
  requireCustomerWrite,
} from './customer-access.util';

const user = (roles: string[]): AuthenticatedUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'customer-test@example.com',
  name: 'Customer Test',
  tenantId: '00000000-0000-0000-0000-000000000002',
  outletId: '00000000-0000-0000-0000-000000000003',
  roles,
});

describe('customer access', () => {
  it.each(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'CASHIER'])(
    'allows %s read and write',
    (role) => {
      expect(() => requireCustomerRead(user([role]))).not.toThrow();
      expect(() => requireCustomerWrite(user([role]))).not.toThrow();
    },
  );

  it('allows waiter create/search but not profile updates', () => {
    expect(() => requireCustomerRead(user(['WAITER']))).not.toThrow();
    expect(() => requireCustomerCreate(user(['WAITER']))).not.toThrow();
    expect(() => requireCustomerWrite(user(['WAITER']))).toThrow(ForbiddenException);
  });

  it.each(['KITCHEN_STAFF', 'CUSTOMER'])('denies %s', (role) => {
    expect(() => requireCustomerRead(user([role]))).toThrow(ForbiddenException);
  });
});
