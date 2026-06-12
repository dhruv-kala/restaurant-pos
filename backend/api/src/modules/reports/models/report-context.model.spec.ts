import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { GENERAL_REPORT_ROLES, ownEmployeeId, reportContext } from './report-context.model';

const user = (roles: string[], outletId = '00000000-0000-0000-0000-000000000003'): AuthenticatedUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'reports@example.com',
  name: 'Reports User',
  tenantId: '00000000-0000-0000-0000-000000000002',
  outletId,
  roles,
});

describe('report context', () => {
  it('forces managers to their authenticated outlet', () => {
    const context = reportContext(
      { page: 1, limit: 50 },
      user(['MANAGER']),
      GENERAL_REPORT_ROLES,
    );
    expect(context.outletId).toBe('00000000-0000-0000-0000-000000000003');
  });

  it('rejects reversed date ranges', () => {
    expect(() =>
      reportContext(
        {
          fromDate: new Date('2026-06-12'),
          toDate: new Date('2026-06-11'),
          page: 1,
          limit: 50,
        },
        user(['TENANT_ADMIN']),
        GENERAL_REPORT_ROLES,
      ),
    ).toThrow(BadRequestException);
  });

  it('denies kitchen staff access to financial reports', () => {
    expect(() =>
      reportContext(
        { page: 1, limit: 50 },
        user(['KITCHEN_STAFF']),
        GENERAL_REPORT_ROLES,
      ),
    ).toThrow(ForbiddenException);
  });

  it('limits waiter performance to the authenticated employee', () => {
    expect(ownEmployeeId(user(['WAITER']))).toBe('00000000-0000-0000-0000-000000000001');
    expect(() =>
      ownEmployeeId(user(['WAITER']), '00000000-0000-0000-0000-000000000004'),
    ).toThrow(BadRequestException);
  });
});
