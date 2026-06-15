import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export interface TaxScope {
  tenantId: string;
}

export function resolveTaxScope(actor: AuthenticatedUser, requestedTenantId?: string): TaxScope {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException('tenantId is required for platform tax access');
    }
    return { tenantId: requestedTenantId };
  }

  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant tax access is forbidden');
  }
  return { tenantId };
}

export function requireTaxProfileRead(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'tax.read') ||
    hasPermission(actor, 'tax.profile_manage') ||
    hasPermission(actor, 'tax.policy_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Tax profile read permission is required');
}

export function requireTaxProfileManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasPermission(actor, 'tax.profile_manage') ||
    hasPermission(actor, 'tax.policy_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Tax profile management permission is required');
}

export function requireFiscalPolicyRead(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'fiscal_policy.read') ||
    hasPermission(actor, 'fiscal_policy.manage') ||
    hasPermission(actor, 'tax.read') ||
    hasPermission(actor, 'tax.policy_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Fiscal policy read permission is required');
}

export function requireFiscalPolicyManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasPermission(actor, 'fiscal_policy.manage') ||
    hasPermission(actor, 'tax.policy_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Fiscal policy management permission is required');
}

export function requireTaxReportView(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'tax.report_view') ||
    hasPermission(actor, 'tax.read')
  ) {
    return;
  }
  throw new ForbiddenException('Tax report view permission is required');
}

function hasPermission(actor: AuthenticatedUser, permission: string): boolean {
  return actor.permissions?.includes('*') || actor.permissions?.includes(permission) || false;
}
