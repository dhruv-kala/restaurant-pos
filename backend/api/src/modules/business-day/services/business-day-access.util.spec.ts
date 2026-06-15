import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  assertOutletAccess,
  requireBusinessDayClose,
  requireBusinessDayOpen,
  requireBusinessDayRead,
  requireCashDrawerAdjust,
  requireCashDrawerClose,
  requireCashDrawerOpen,
  requireCashDrawerRead,
  requireShiftSessionClose,
  requireShiftSessionOpen,
  requireShiftSessionRead,
  resolveBusinessDayScope,
  assertShiftActorCanAssign,
} from './business-day-access.util';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';

const tenantAdmin: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'admin@example.test',
  name: 'Admin',
  tenantId,
  outletId: null,
  roles: ['TENANT_ADMIN'],
  permissions: [],
};

describe('business day access utilities', () => {
  it('requires explicit tenant scope for platform access', () => {
    expect(() =>
      resolveBusinessDayScope({ ...tenantAdmin, tenantId: null, roles: ['SUPER_ADMIN'] }),
    ).toThrow(BadRequestException);
    expect(
      resolveBusinessDayScope({ ...tenantAdmin, tenantId: null, roles: ['SUPER_ADMIN'] }, tenantId),
    ).toEqual({ tenantId });
  });

  it('blocks cross-tenant access for tenant users', () => {
    expect(() =>
      resolveBusinessDayScope(tenantAdmin, '01975c30-0000-7000-8000-000000000999'),
    ).toThrow(ForbiddenException);
  });

  it('allows tenant admins and managers to operate business days', () => {
    const manager = { ...tenantAdmin, roles: ['MANAGER'], outletId };
    expect(() => requireBusinessDayRead(tenantAdmin)).not.toThrow();
    expect(() => requireBusinessDayOpen(tenantAdmin)).not.toThrow();
    expect(() => requireBusinessDayClose(tenantAdmin)).not.toThrow();
    expect(() => requireBusinessDayRead(manager)).not.toThrow();
    expect(() => requireBusinessDayOpen(manager)).not.toThrow();
    expect(() => requireBusinessDayClose(manager)).not.toThrow();
  });

  it('supports granular permissions without privileged roles', () => {
    const user = { ...tenantAdmin, roles: ['CASHIER'], permissions: ['business_day.read'] };
    expect(() => requireBusinessDayRead(user)).not.toThrow();
    expect(() => requireBusinessDayOpen(user)).toThrow(ForbiddenException);
    expect(() =>
      requireBusinessDayOpen({ ...user, permissions: ['business_day.open'] }),
    ).not.toThrow();
    expect(() =>
      requireBusinessDayClose({ ...user, permissions: ['business_day.close'] }),
    ).not.toThrow();
  });

  it('enforces outlet access for outlet-bound users', () => {
    const manager = { ...tenantAdmin, roles: ['MANAGER'], outletId };
    expect(() => assertOutletAccess(manager, outletId)).not.toThrow();
    expect(() => assertOutletAccess(manager, '01975c30-0000-7000-8000-000000000201')).toThrow(
      ForbiddenException,
    );
    expect(() => assertOutletAccess(tenantAdmin, outletId)).not.toThrow();
  });

  it('allows managers and granular permissions to operate shift sessions', () => {
    const manager = { ...tenantAdmin, roles: ['MANAGER'], outletId };
    expect(() => requireShiftSessionRead(manager)).not.toThrow();
    expect(() => requireShiftSessionOpen(manager)).not.toThrow();
    expect(() => requireShiftSessionClose(manager)).not.toThrow();

    const cashier = { ...tenantAdmin, roles: ['CASHIER'], permissions: ['shifts.read'] };
    expect(() => requireShiftSessionRead(cashier)).not.toThrow();
    expect(() => requireShiftSessionOpen(cashier)).toThrow(ForbiddenException);
    expect(() =>
      requireShiftSessionOpen({ ...cashier, permissions: ['shifts.open'] }),
    ).not.toThrow();
    expect(() =>
      requireShiftSessionClose({ ...cashier, permissions: ['shifts.close'] }),
    ).not.toThrow();
  });

  it('limits non-manager shift operations to the actor user', () => {
    const cashier = { ...tenantAdmin, roles: ['CASHIER'], permissions: ['shifts.open'] };
    expect(() => assertShiftActorCanAssign(cashier, tenantAdmin.id)).not.toThrow();
    expect(() =>
      assertShiftActorCanAssign(cashier, '01975c30-0000-7000-8000-000000000002'),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertShiftActorCanAssign(
        { ...tenantAdmin, roles: ['MANAGER'] },
        '01975c30-0000-7000-8000-000000000002',
      ),
    ).not.toThrow();
  });

  it('allows managers and granular permissions to operate cash drawers', () => {
    const manager = { ...tenantAdmin, roles: ['MANAGER'], outletId };
    expect(() => requireCashDrawerRead(manager)).not.toThrow();
    expect(() => requireCashDrawerOpen(manager)).not.toThrow();
    expect(() => requireCashDrawerAdjust(manager)).not.toThrow();
    expect(() => requireCashDrawerClose(manager)).not.toThrow();

    const cashier = { ...tenantAdmin, roles: ['CASHIER'], permissions: ['cash_drawer.read'] };
    expect(() => requireCashDrawerRead(cashier)).not.toThrow();
    expect(() => requireCashDrawerOpen(cashier)).toThrow(ForbiddenException);
    expect(() =>
      requireCashDrawerOpen({ ...cashier, permissions: ['cash_drawer.open'] }),
    ).not.toThrow();
    expect(() =>
      requireCashDrawerAdjust({ ...cashier, permissions: ['cash_drawer.adjust'] }),
    ).not.toThrow();
    expect(() =>
      requireCashDrawerClose({ ...cashier, permissions: ['cash_drawer.close'] }),
    ).not.toThrow();
  });
});
