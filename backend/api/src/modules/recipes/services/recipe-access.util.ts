import {
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { resolveOrderScope } from '../../orders/services/order-access.util';

const ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'INVENTORY_MANAGER',
  'KITCHEN_MANAGER',
];

export const requireRecipeAccess = (user: AuthenticatedUser): void =>
  requireRole(user, ROLES);
export const resolveRecipeScope = resolveOrderScope;
