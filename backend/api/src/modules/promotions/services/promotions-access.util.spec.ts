import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireCouponManage,
  requireCouponValidate,
  requireDiscountOverride,
  resolvePromotionsScope,
} from './promotions-access.util';

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'user@example.test',
    name: 'User',
    tenantId: 'tenant-1',
    outletId: 'outlet-1',
    roles: ['WAITER'],
    permissions: ['promotions.read'],
    ...overrides,
  };
}

describe('promotions access', () => {
  it('requires platform administrators to select a tenant', () => {
    expect(() => resolvePromotionsScope(actor({ tenantId: null, roles: ['SUPER_ADMIN'] }))).toThrow(
      BadRequestException,
    );
  });

  it('locks managers to their authenticated outlet', () => {
    expect(() =>
      resolvePromotionsScope(actor({ roles: ['MANAGER'] }), 'tenant-1', 'outlet-2'),
    ).toThrow(ForbiddenException);
  });

  it('does not allow cashiers to perform arbitrary discount overrides', () => {
    expect(() =>
      requireDiscountOverride(
        actor({ roles: ['CASHIER'], permissions: ['promotions.apply_discount'] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows managers to override discounts', () => {
    expect(() => requireDiscountOverride(actor({ roles: ['MANAGER'] }))).not.toThrow();
  });

  it('does not allow cashiers to manage coupons', () => {
    expect(() =>
      requireCouponManage(actor({ roles: ['CASHIER'], permissions: ['promotions.coupon_view'] })),
    ).toThrow(ForbiddenException);
  });

  it('allows cashiers to validate coupons', () => {
    expect(() => requireCouponValidate(actor({ roles: ['CASHIER'] }))).not.toThrow();
  });
});
