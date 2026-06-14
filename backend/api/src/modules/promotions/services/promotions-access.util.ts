import { BadRequestException, ForbiddenException } from '@nestjs/common';

import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export interface PromotionsScope {
  tenantId: string;
  outletId?: string;
  managerOutletOnly: boolean;
}

const DISCOUNT_POLICY_READ_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'CASHIER',
  'WAITER',
];

export function resolvePromotionsScope(
  actor: AuthenticatedUser,
  requestedTenantId?: string,
  requestedOutletId?: string | null,
): PromotionsScope {
  if (hasRole(actor, PLATFORM_ADMIN_ROLE)) {
    if (!requestedTenantId) {
      throw new BadRequestException('tenantId is required for platform promotion access');
    }
    return {
      tenantId: requestedTenantId,
      outletId: requestedOutletId ?? undefined,
      managerOutletOnly: false,
    };
  }

  const tenantId = requireTenantId(actor);
  if (requestedTenantId && requestedTenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant promotion access is forbidden');
  }

  if (hasRole(actor, MANAGER_ROLE) && actor.outletId) {
    if (requestedOutletId && requestedOutletId !== actor.outletId) {
      throw new ForbiddenException('Managers can manage promotions only within their outlet');
    }
    return { tenantId, outletId: actor.outletId, managerOutletOnly: true };
  }

  return {
    tenantId,
    outletId: requestedOutletId ?? undefined,
    managerOutletOnly: false,
  };
}

export function requireDiscountPolicyRead(actor: AuthenticatedUser): void {
  if (
    DISCOUNT_POLICY_READ_ROLES.some((role) => hasRole(actor, role)) ||
    hasPermission(actor, 'promotions.read') ||
    hasPermission(actor, 'promotions.policy_manage') ||
    hasPermission(actor, 'promotions.apply_discount')
  ) {
    return;
  }
  throw new ForbiddenException('Promotion read permission is required');
}

export function requireDiscountPolicyManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'promotions.policy_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Discount policy management permission is required');
}

export function requireDiscountApply(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasRole(actor, 'CASHIER') ||
    hasPermission(actor, 'promotions.apply_discount') ||
    hasPermission(actor, 'promotions.override_discount')
  ) {
    return;
  }
  throw new ForbiddenException('Discount application permission is required');
}

export function requireDiscountOverride(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'promotions.override_discount')
  ) {
    return;
  }
  throw new ForbiddenException('Discount override permission is required');
}

export function requireCouponRead(actor: AuthenticatedUser): void {
  if (
    DISCOUNT_POLICY_READ_ROLES.some((role) => hasRole(actor, role)) ||
    hasPermission(actor, 'promotions.read') ||
    hasPermission(actor, 'promotions.coupon_view') ||
    hasPermission(actor, 'promotions.coupon_manage') ||
    hasPermission(actor, 'promotions.coupon_validate')
  ) {
    return;
  }
  throw new ForbiddenException('Coupon read permission is required');
}

export function requireCouponManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'promotions.coupon_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Coupon management permission is required');
}

export function requireCouponValidate(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasRole(actor, 'CASHIER') ||
    hasRole(actor, 'WAITER') ||
    hasPermission(actor, 'promotions.coupon_validate') ||
    hasPermission(actor, 'promotions.apply_discount')
  ) {
    return;
  }
  throw new ForbiddenException('Coupon validation permission is required');
}

export function requireCampaignRead(actor: AuthenticatedUser): void {
  if (
    DISCOUNT_POLICY_READ_ROLES.some((role) => hasRole(actor, role)) ||
    hasPermission(actor, 'promotions.read') ||
    hasPermission(actor, 'promotions.campaign_view') ||
    hasPermission(actor, 'promotions.campaign_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Promotion campaign read permission is required');
}

export function requireCampaignManage(actor: AuthenticatedUser): void {
  if (
    hasRole(actor, PLATFORM_ADMIN_ROLE) ||
    hasRole(actor, TENANT_ADMIN_ROLE) ||
    hasRole(actor, MANAGER_ROLE) ||
    hasPermission(actor, 'promotions.campaign_manage')
  ) {
    return;
  }
  throw new ForbiddenException('Promotion campaign management permission is required');
}

function hasPermission(actor: AuthenticatedUser, permission: string): boolean {
  return actor.permissions?.includes(permission) ?? false;
}
