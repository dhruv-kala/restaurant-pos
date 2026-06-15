import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  CashDrawerStatus,
  Prisma,
  ShiftSessionStatus,
  type ShiftReconciliation,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  CreateShiftReconciliationDto,
  ShiftReconciliationQueryDto,
  TenantShiftReconciliationQueryDto,
} from '../dto/shift-reconciliation.dto';
import {
  assertOutletAccess,
  assertShiftActorCanAssign,
  canManageOperationalScope,
  requireShiftReconciliationCreate,
  requireShiftReconciliationRead,
  resolveBusinessDayScope,
} from './business-day-access.util';

@Injectable()
export class ShiftReconciliationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateShiftReconciliationDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireShiftReconciliationCreate(actor);
    const scope = resolveBusinessDayScope(actor, dto.tenantId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const shiftSession = await this.findShiftSession(tx, scope.tenantId, dto.shiftSessionId);
      assertOutletAccess(actor, shiftSession.outletId);
      assertShiftActorCanAssign(actor, shiftSession.assignedUserId);
      await this.lockShiftSession(tx, scope.tenantId, shiftSession.id);
      if (shiftSession.status !== ShiftSessionStatus.OPEN) {
        throw new ConflictException('Shift reconciliation must be recorded before shift closure');
      }
      const drawer = await tx.cashDrawer.findFirst({
        where: {
          tenantId: scope.tenantId,
          id: dto.cashDrawerId,
          shiftSessionId: shiftSession.id,
        },
      });
      if (!drawer) {
        throw new NotFoundException('Cash drawer not found for shift session');
      }
      if (drawer.status !== CashDrawerStatus.CLOSED || drawer.closingBalanceMinor === null) {
        throw new ConflictException('Cash drawer must be closed before shift reconciliation');
      }
      const existing = await tx.shiftReconciliation.findFirst({
        where: { tenantId: scope.tenantId, shiftSessionId: shiftSession.id },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Shift session has already been reconciled');
      }
      const varianceMinor = dto.countedCashMinor - drawer.expectedCashMinor;
      const approvalNotes = this.optionalText(dto.approvalNotes);
      if (varianceMinor !== 0 && !approvalNotes) {
        throw new BadRequestException('Approval notes are required for cash variance');
      }
      const reconciliation = await tx.shiftReconciliation.create({
        data: {
          tenantId: scope.tenantId,
          outletId: shiftSession.outletId,
          businessDayId: shiftSession.businessDayId,
          shiftSessionId: shiftSession.id,
          cashDrawerId: drawer.id,
          currencyCode: drawer.currencyCode,
          expectedCashMinor: drawer.expectedCashMinor,
          countedCashMinor: dto.countedCashMinor,
          varianceMinor,
          approvalNotes,
          reconciledByUserId: actor.id,
        },
      });
      await this.auditReconciliation(
        tx,
        reconciliation,
        actor,
        request,
        'shift_reconciliation.recorded',
      );
      return this.toResponse(reconciliation);
    });
  }

  async list(query: ShiftReconciliationQueryDto, actor: AuthenticatedUser) {
    requireShiftReconciliationRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    if (query.outletId) {
      assertOutletAccess(actor, query.outletId);
    } else if (actor.outletId !== null) {
      query.outletId = actor.outletId;
    }

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.ShiftReconciliationWhereInput = {
        tenantId: scope.tenantId,
        ...(query.outletId ? { outletId: query.outletId } : {}),
        ...(query.businessDayId ? { businessDayId: query.businessDayId } : {}),
        ...(query.shiftSessionId ? { shiftSessionId: query.shiftSessionId } : {}),
        ...(query.cashDrawerId ? { cashDrawerId: query.cashDrawerId } : {}),
        ...(canManageOperationalScope(actor) ? {} : { shiftSession: { assignedUserId: actor.id } }),
      };
      const [reconciliations, total] = await Promise.all([
        tx.shiftReconciliation.findMany({
          where,
          orderBy: [{ reconciledAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.shiftReconciliation.count({ where }),
      ]);
      return {
        data: reconciliations.map((reconciliation) => this.toResponse(reconciliation)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async get(id: string, query: TenantShiftReconciliationQueryDto, actor: AuthenticatedUser) {
    requireShiftReconciliationRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const reconciliation = await tx.shiftReconciliation.findFirst({
        where: { tenantId: scope.tenantId, id },
        include: { shiftSession: { select: { assignedUserId: true } } },
      });
      if (!reconciliation) {
        throw new NotFoundException('Shift reconciliation not found');
      }
      assertOutletAccess(actor, reconciliation.outletId);
      if (!canManageOperationalScope(actor)) {
        assertShiftActorCanAssign(actor, reconciliation.shiftSession.assignedUserId);
      }
      return this.toResponse(reconciliation);
    });
  }

  private async findShiftSession(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<{
    id: string;
    tenantId: string;
    outletId: string;
    businessDayId: string;
    assignedUserId: string;
    status: ShiftSessionStatus;
  }> {
    const session = await tx.shiftSession.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        tenantId: true,
        outletId: true,
        businessDayId: true,
        assignedUserId: true,
        status: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Shift session not found');
    }
    return session;
  }

  private async lockShiftSession(
    tx: Prisma.TransactionClient,
    tenantId: string,
    shiftSessionId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId || ''} || ':shift-reconciliation:' || ${shiftSessionId || ''}))`;
  }

  private async auditReconciliation(
    tx: Prisma.TransactionClient,
    reconciliation: ShiftReconciliation,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: reconciliation.tenantId,
      outletId: reconciliation.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'ShiftReconciliation',
      targetId: reconciliation.id,
      result: AuditResult.SUCCESS,
      metadata: {
        businessDayId: reconciliation.businessDayId,
        shiftSessionId: reconciliation.shiftSessionId,
        cashDrawerId: reconciliation.cashDrawerId,
        currencyCode: reconciliation.currencyCode,
        expectedCashMinor: reconciliation.expectedCashMinor,
        countedCashMinor: reconciliation.countedCashMinor,
        varianceMinor: reconciliation.varianceMinor,
        hasApprovalNotes: reconciliation.approvalNotes !== null,
      },
      ...request,
    });
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toResponse(
    reconciliation: ShiftReconciliation & {
      shiftSession?: { assignedUserId: string };
    },
  ) {
    return {
      id: reconciliation.id,
      tenantId: reconciliation.tenantId,
      outletId: reconciliation.outletId,
      businessDayId: reconciliation.businessDayId,
      shiftSessionId: reconciliation.shiftSessionId,
      cashDrawerId: reconciliation.cashDrawerId,
      currencyCode: reconciliation.currencyCode,
      expectedCashMinor: reconciliation.expectedCashMinor,
      countedCashMinor: reconciliation.countedCashMinor,
      varianceMinor: reconciliation.varianceMinor,
      approvalNotes: reconciliation.approvalNotes,
      reconciledByUserId: reconciliation.reconciledByUserId,
      reconciledAt: reconciliation.reconciledAt.toISOString(),
      createdAt: reconciliation.createdAt.toISOString(),
    };
  }
}
