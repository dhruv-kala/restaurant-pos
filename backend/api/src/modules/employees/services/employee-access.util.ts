import { ForbiddenException } from '@nestjs/common';
import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export const EMPLOYEE_MANAGEMENT_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'HR_MANAGER',
];
export const EMPLOYEE_READ_ROLES = [...EMPLOYEE_MANAGEMENT_ROLES, 'EMPLOYEE'];

export const requireEmployeeManagement = (user: AuthenticatedUser) =>
  requireRole(user, EMPLOYEE_MANAGEMENT_ROLES);
export const requireEmployeeRead = (user: AuthenticatedUser) =>
  requireRole(user, EMPLOYEE_READ_ROLES);
export const isEmployeeSelfOnly = (user: AuthenticatedUser) =>
  hasRole(user, 'EMPLOYEE') &&
  !EMPLOYEE_MANAGEMENT_ROLES.some((role) => hasRole(user, role));

export function resolveEmployeeScope(
  tenantId: string | undefined,
  outletId: string | undefined,
  user: AuthenticatedUser,
): { tenantId?: string; outletId?: string } {
  if (hasRole(user, PLATFORM_ADMIN_ROLE)) return { tenantId, outletId };
  const trustedTenantId = requireTenantId(user);
  if (tenantId && tenantId !== trustedTenantId) {
    throw new ForbiddenException('Cross-tenant access is forbidden');
  }
  if (hasRole(user, TENANT_ADMIN_ROLE) || hasRole(user, 'HR_MANAGER')) {
    return { tenantId: trustedTenantId, outletId };
  }
  if (!user.outletId) throw new ForbiddenException('Outlet context is required');
  if (outletId && outletId !== user.outletId) {
    throw new ForbiddenException('Cross-outlet access is forbidden');
  }
  return { tenantId: trustedTenantId, outletId: user.outletId };
}
