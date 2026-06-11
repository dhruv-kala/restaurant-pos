import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireKitchenConfigure,
  requireKitchenRead,
  requireKitchenWrite,
} from './kitchen-access.util';

const user = (roles: string[]): AuthenticatedUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  name: 'User',
  tenantId: '00000000-0000-0000-0000-000000000002',
  outletId: '00000000-0000-0000-0000-000000000003',
  roles,
});

describe('kitchen access', () => {
  it('allows cashier and waiter read-only access', () => {
    for (const role of ['CASHIER', 'WAITER']) {
      expect(() => requireKitchenRead(user([role]))).not.toThrow();
      expect(() => requireKitchenWrite(user([role]))).toThrow(ForbiddenException);
    }
  });

  it('allows kitchen staff transitions but not configuration', () => {
    expect(() => requireKitchenWrite(user(['KITCHEN_STAFF']))).not.toThrow();
    expect(() => requireKitchenConfigure(user(['KITCHEN_STAFF']))).toThrow(ForbiddenException);
  });

  it('allows managers to configure and operate stations', () => {
    expect(() => requireKitchenConfigure(user(['MANAGER']))).not.toThrow();
    expect(() => requireKitchenWrite(user(['MANAGER']))).not.toThrow();
  });
});
