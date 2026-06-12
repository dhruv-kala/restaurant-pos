import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { requireRecipeAccess } from './recipe-access.util';

const user = (roles: string[]): AuthenticatedUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'recipe@example.com',
  name: 'Recipe User',
  tenantId: '00000000-0000-0000-0000-000000000002',
  outletId: '00000000-0000-0000-0000-000000000003',
  roles,
});

describe('recipe access', () => {
  it.each([
    'SUPER_ADMIN',
    'TENANT_ADMIN',
    'MANAGER',
    'INVENTORY_MANAGER',
    'KITCHEN_MANAGER',
  ])('allows %s', (role) => {
    expect(() => requireRecipeAccess(user([role]))).not.toThrow();
  });

  it.each(['CASHIER', 'WAITER', 'KITCHEN_STAFF'])('denies %s', (role) => {
    expect(() => requireRecipeAccess(user([role]))).toThrow(ForbiddenException);
  });
});
