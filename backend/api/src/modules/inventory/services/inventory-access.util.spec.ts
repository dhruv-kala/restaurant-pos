import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireInventoryRead, requireInventoryWrite } from './inventory-access.util';

const user = (roles: string[]): AuthenticatedUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'inventory@example.com',
  name: 'Inventory User',
  tenantId: '00000000-0000-0000-0000-000000000002',
  outletId: '00000000-0000-0000-0000-000000000003',
  roles,
});

describe('inventory access', () => {
  it('allows kitchen staff read-only access', () => {
    expect(() => requireInventoryRead(user(['KITCHEN_STAFF']))).not.toThrow();
    expect(() => requireInventoryWrite(user(['KITCHEN_STAFF']))).toThrow(ForbiddenException);
  });

  it('allows inventory managers to read and write', () => {
    expect(() => requireInventoryRead(user(['INVENTORY_MANAGER']))).not.toThrow();
    expect(() => requireInventoryWrite(user(['INVENTORY_MANAGER']))).not.toThrow();
  });

  it('denies cashier and waiter access', () => {
    for (const role of ['CASHIER', 'WAITER']) {
      expect(() => requireInventoryRead(user([role]))).toThrow(ForbiddenException);
    }
  });
});
