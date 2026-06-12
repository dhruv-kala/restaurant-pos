import { BadRequestException } from '@nestjs/common';
import { Prisma, ReportExportFormat } from '@prisma/client';
import {
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  TENANT_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { resolveOrderScope } from '../../orders/services/order-access.util';
import type { ReportFilterDto } from '../dto/report-filter.dto';

export const GENERAL_REPORT_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
  'CASHIER',
];
export const MANAGEMENT_REPORT_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  MANAGER_ROLE,
];
export const INVENTORY_REPORT_ROLES = [...MANAGEMENT_REPORT_ROLES, 'INVENTORY_MANAGER'];
export const KITCHEN_REPORT_ROLES = [
  ...MANAGEMENT_REPORT_ROLES,
  'KITCHEN_STAFF',
  'KITCHEN_MANAGER',
];
export const STAFF_REPORT_ROLES = [...MANAGEMENT_REPORT_ROLES, 'WAITER'];

export interface ReportContext {
  tenantId?: string;
  outletId?: string;
  fromDate: Date;
  toDate: Date;
}

export function reportContext(
  filter: ReportFilterDto,
  user: AuthenticatedUser,
  roles: string[],
): ReportContext {
  requireRole(user, roles);
  const scope = resolveOrderScope(filter.tenantId, filter.outletId, user, false);
  const today = utcDate(new Date());
  const fromDate = utcDate(filter.businessDate ?? filter.fromDate ?? today);
  const toDate = utcDate(filter.businessDate ?? filter.toDate ?? fromDate);
  if (fromDate > toDate) throw new BadRequestException('fromDate must not exceed toDate');
  return { ...scope, fromDate, toDate };
}

export function dateRange(context: ReportContext): Prisma.DateTimeFilter {
  return { gte: context.fromDate, lte: context.toDate };
}

export function auditData(
  reportType: string,
  filter: ReportFilterDto,
  context: ReportContext,
  user: AuthenticatedUser,
  exportFormat?: ReportExportFormat,
): Prisma.ReportGenerationAuditCreateInput {
  return {
    reportType,
    exportFormat,
    filters: JSON.parse(JSON.stringify(filter)) as Prisma.InputJsonValue,
    generatedBy: { connect: { id: user.id } },
    ...(context.tenantId ? { tenant: { connect: { id: context.tenantId } } } : {}),
    ...(context.tenantId && context.outletId
      ? {
          outlet: {
            connect: {
              tenantId_id: { tenantId: context.tenantId, id: context.outletId },
            },
          },
        }
      : {}),
  };
}

export function ownEmployeeId(user: AuthenticatedUser, requested?: string): string | undefined {
  if (!hasRole(user, 'WAITER')) return requested;
  if (requested !== undefined && requested !== user.id) {
    throw new BadRequestException('Waiters may only access their own performance');
  }
  return user.id;
}

function utcDate(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
