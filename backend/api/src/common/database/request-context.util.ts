import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type';

export const PLATFORM_ADMIN_ROLE = 'SUPER_ADMIN';
export const TENANT_ADMIN_ROLE = 'TENANT_ADMIN';
export const MANAGER_ROLE = 'MANAGER';

export function hasRole(user: AuthenticatedUser, role: string): boolean {
  return user.roles.includes(role);
}

export function requireRole(
  user: AuthenticatedUser,
  allowedRoles: string[],
): void {
  if (!allowedRoles.some((role) => hasRole(user, role))) {
    throw new ForbiddenException('Insufficient permissions');
  }
}

export function requireTenantId(user: AuthenticatedUser): string {
  if (user.tenantId === null) {
    throw new ForbiddenException('Tenant context is required');
  }

  return user.tenantId;
}

export async function applyDatabaseRequestContext(
  transaction: Prisma.TransactionClient,
  user: AuthenticatedUser,
  tenantId?: string,
): Promise<void> {
  await transaction.$queryRaw`SELECT set_config('app.user_id', ${user.id}, true)`;

  if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
    await transaction.$queryRaw`SELECT set_config('app.is_platform_admin', 'true', true)`;
    if (tenantId !== undefined) {
      await transaction.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    }
    return;
  }

  const trustedTenantId = requireTenantId(user);
  if (tenantId !== undefined && tenantId !== trustedTenantId) {
    throw new ForbiddenException('Cross-tenant access is forbidden');
  }

  await transaction.$queryRaw`SELECT set_config('app.tenant_id', ${trustedTenantId}, true)`;
}
