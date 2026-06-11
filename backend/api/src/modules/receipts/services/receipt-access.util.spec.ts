import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireReceiptRead, requireReceiptWrite } from './receipt-access.util';

const user = (roles: string[]): AuthenticatedUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  name: 'User',
  tenantId: '00000000-0000-0000-0000-000000000002',
  outletId: '00000000-0000-0000-0000-000000000003',
  roles,
});

describe('receipt access', () => {
  it('allows waiter read access but denies print access', () => {
    expect(() => requireReceiptRead(user(['WAITER']))).not.toThrow();
    expect(() => requireReceiptWrite(user(['WAITER']))).toThrow(ForbiddenException);
  });

  it('denies kitchen staff access', () => {
    expect(() => requireReceiptRead(user(['KITCHEN_STAFF']))).toThrow(ForbiddenException);
  });

  it('allows cashier print access', () => {
    expect(() => requireReceiptWrite(user(['CASHIER']))).not.toThrow();
  });
});
