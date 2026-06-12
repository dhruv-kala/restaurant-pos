import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  isEmployeeSelfOnly,
  requireEmployeeManagement,
  requireEmployeeRead,
  resolveEmployeeScope,
} from './employee-access.util';

const user = (roles: string[], outletId = '00000000-0000-0000-0000-000000000003'): AuthenticatedUser => ({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'employees@example.com',
  name: 'Employee Test',
  tenantId: '00000000-0000-0000-0000-000000000002',
  outletId,
  roles,
});

describe('employee access', () => {
  it.each(['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'HR_MANAGER'])(
    'allows %s management',
    (role) => expect(() => requireEmployeeManagement(user([role]))).not.toThrow(),
  );

  it('allows employee self-read but not management', () => {
    expect(() => requireEmployeeRead(user(['EMPLOYEE']))).not.toThrow();
    expect(() => requireEmployeeManagement(user(['EMPLOYEE']))).toThrow(ForbiddenException);
    expect(isEmployeeSelfOnly(user(['EMPLOYEE']))).toBe(true);
  });

  it('forces managers to their outlet and rejects widening', () => {
    expect(resolveEmployeeScope(undefined, undefined, user(['MANAGER'])).outletId).toBe(
      '00000000-0000-0000-0000-000000000003',
    );
    expect(() =>
      resolveEmployeeScope(
        undefined,
        '00000000-0000-0000-0000-000000000004',
        user(['MANAGER']),
      ),
    ).toThrow(ForbiddenException);
  });
});
