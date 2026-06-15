import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  requireFiscalPolicyManage,
  requireFiscalPolicyRead,
  requireTaxProfileManage,
  requireTaxProfileRead,
  requireTaxReportView,
  resolveTaxScope,
} from './tax-access.util';

const tenantId = '01975c30-0000-7000-8000-000000000100';

const tenantAdmin: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'admin@example.test',
  name: 'Admin',
  tenantId,
  outletId: null,
  roles: ['TENANT_ADMIN'],
  permissions: [],
};

describe('tax access utilities', () => {
  it('requires explicit tenant scope for platform tax access', () => {
    expect(() =>
      resolveTaxScope({ ...tenantAdmin, tenantId: null, roles: ['SUPER_ADMIN'] }),
    ).toThrow(BadRequestException);
    expect(
      resolveTaxScope({ ...tenantAdmin, tenantId: null, roles: ['SUPER_ADMIN'] }, tenantId),
    ).toEqual({ tenantId });
  });

  it('blocks cross-tenant tax access for tenant users', () => {
    expect(() => resolveTaxScope(tenantAdmin, '01975c30-0000-7000-8000-000000000999')).toThrow(
      ForbiddenException,
    );
  });

  it('allows tenant admins to read and manage tax profiles', () => {
    expect(() => requireTaxProfileRead(tenantAdmin)).not.toThrow();
    expect(() => requireTaxProfileManage(tenantAdmin)).not.toThrow();
  });

  it('allows managers to read but not manage tax profiles by role', () => {
    const manager = { ...tenantAdmin, roles: ['MANAGER'] };
    expect(() => requireTaxProfileRead(manager)).not.toThrow();
    expect(() => requireTaxProfileManage(manager)).toThrow(ForbiddenException);
  });

  it('allows tenant admins to manage fiscal policy and managers to read only', () => {
    const manager = { ...tenantAdmin, roles: ['MANAGER'] };
    expect(() => requireFiscalPolicyRead(tenantAdmin)).not.toThrow();
    expect(() => requireFiscalPolicyManage(tenantAdmin)).not.toThrow();
    expect(() => requireFiscalPolicyRead(manager)).not.toThrow();
    expect(() => requireFiscalPolicyManage(manager)).toThrow(ForbiddenException);
  });

  it('allows tax reports by role or permission', () => {
    expect(() => requireTaxReportView(tenantAdmin)).not.toThrow();
    expect(() => requireTaxReportView({ ...tenantAdmin, roles: ['MANAGER'] })).not.toThrow();
    expect(() =>
      requireTaxReportView({
        ...tenantAdmin,
        roles: ['CASHIER'],
        permissions: ['tax.report_view'],
      }),
    ).not.toThrow();
    expect(() => requireTaxReportView({ ...tenantAdmin, roles: ['CASHIER'] })).toThrow(
      ForbiddenException,
    );
  });
});
