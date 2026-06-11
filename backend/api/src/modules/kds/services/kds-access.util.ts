import {
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { resolveOrderScope } from '../../orders/services/order-access.util';

const KDS_READ_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'KITCHEN_STAFF',
  'WAITER',
];
const KDS_WRITE_ROLES = [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE, 'KITCHEN_STAFF'];
const KDS_CONFIGURE_ROLES = [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE];

export const requireKdsRead = (user: AuthenticatedUser): void => requireRole(user, KDS_READ_ROLES);
export const requireKdsWrite = (user: AuthenticatedUser): void =>
  requireRole(user, KDS_WRITE_ROLES);
export const requireKdsConfigure = (user: AuthenticatedUser): void =>
  requireRole(user, KDS_CONFIGURE_ROLES);
export const resolveKdsScope = resolveOrderScope;
