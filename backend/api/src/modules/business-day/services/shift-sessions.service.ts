import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditResult,
  BusinessDayStatus,
  EmployeeStatus,
  Prisma,
  ShiftSessionStatus,
  type BusinessDay,
  type ShiftSession,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  CloseShiftSessionDto,
  CurrentShiftSessionQueryDto,
  OpenShiftSessionDto,
  ShiftSessionQueryDto,
  TenantShiftSessionQueryDto,
} from '../dto/shift-session.dto';
import {
  assertOutletAccess,
  assertShiftActorCanAssign,
  requireShiftSessionClose,
  requireShiftSessionOpen,
  requireShiftSessionRead,
  resolveBusinessDayScope,
} from './business-day-access.util';

@Injectable()
export class ShiftSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async open(dto: OpenShiftSessionDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireShiftSessionOpen(actor);
    const scope = resolveBusinessDayScope(actor, dto.tenantId);
    assertOutletAccess(actor, dto.outletId);
    const assignedUserId = dto.assignedUserId ?? actor.id;
    assertShiftActorCanAssign(actor, assignedUserId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockAssignedUser(tx, scope.tenantId, assignedUserId);
      const businessDay = await this.currentBusinessDay(tx, scope.tenantId, dto.outletId);
      const employee = await this.findAssignedEmployee(
        tx,
        scope.tenantId,
        dto.outletId,
        assignedUserId,
      );
      const shiftId =
        dto.shiftId ??
        (await this.resolveAssignedShiftId(tx, employee.id, businessDay.businessDate));
      if (shiftId) {
        await this.assertShiftTemplate(tx, scope.tenantId, dto.outletId, shiftId);
      }
      const active = await tx.shiftSession.findFirst({
        where: {
          tenantId: scope.tenantId,
          assignedUserId,
          status: ShiftSessionStatus.OPEN,
        },
        select: { id: true },
      });
      if (active) {
        throw new ConflictException('User already has an active shift session');
      }
      const session = await tx.shiftSession.create({
        data: {
          tenantId: scope.tenantId,
          outletId: dto.outletId,
          businessDayId: businessDay.id,
          assignedUserId,
          shiftId,
          openedByUserId: actor.id,
          openingNotes: this.optionalText(dto.openingNotes),
        },
      });
      await this.auditShiftSession(tx, session, actor, request, 'shift_session.opened');
      return this.toResponse(session);
    });
  }

  async close(
    id: string,
    dto: CloseShiftSessionDto,
    query: TenantShiftSessionQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireShiftSessionClose(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findSession(tx, scope.tenantId, id);
      assertOutletAccess(actor, existing.outletId);
      assertShiftActorCanAssign(actor, existing.assignedUserId);
      await this.lockAssignedUser(tx, scope.tenantId, existing.assignedUserId);
      if (existing.status !== ShiftSessionStatus.OPEN) {
        throw new ConflictException('Shift session is already closed');
      }
      const reconciliation = await tx.shiftReconciliation.findFirst({
        where: { tenantId: scope.tenantId, shiftSessionId: id },
        select: { id: true },
      });
      if (!reconciliation) {
        throw new ConflictException(
          'Shift reconciliation is required before closing shift session',
        );
      }
      const updated = await tx.shiftSession.updateMany({
        where: {
          tenantId: scope.tenantId,
          id,
          version: dto.version,
          status: ShiftSessionStatus.OPEN,
        },
        data: {
          status: ShiftSessionStatus.CLOSED,
          closedAt: new Date(),
          closedByUserId: actor.id,
          closingNotes: this.optionalText(dto.closingNotes),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Shift session was updated by another request');
      }
      const closed = await this.findSession(tx, scope.tenantId, id);
      await this.auditShiftSession(tx, closed, actor, request, 'shift_session.closed');
      return this.toResponse(closed);
    });
  }

  async current(query: CurrentShiftSessionQueryDto, actor: AuthenticatedUser) {
    requireShiftSessionRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    const assignedUserId = query.assignedUserId ?? actor.id;
    assertShiftActorCanAssign(actor, assignedUserId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const session = await tx.shiftSession.findFirst({
        where: {
          tenantId: scope.tenantId,
          assignedUserId,
          status: ShiftSessionStatus.OPEN,
        },
        orderBy: { openedAt: 'desc' },
      });
      if (!session) {
        throw new NotFoundException('Current shift session not found');
      }
      assertOutletAccess(actor, session.outletId);
      return this.toResponse(session);
    });
  }

  async list(query: ShiftSessionQueryDto, actor: AuthenticatedUser) {
    requireShiftSessionRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    if (query.outletId) {
      assertOutletAccess(actor, query.outletId);
    } else if (actor.outletId !== null) {
      query.outletId = actor.outletId;
    }
    if (query.assignedUserId) {
      assertShiftActorCanAssign(actor, query.assignedUserId);
    }

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.ShiftSessionWhereInput = {
        tenantId: scope.tenantId,
        ...(query.outletId ? { outletId: query.outletId } : {}),
        ...(query.businessDayId ? { businessDayId: query.businessDayId } : {}),
        ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
        ...(query.status ? { status: query.status } : {}),
      };
      const [sessions, total] = await Promise.all([
        tx.shiftSession.findMany({
          where,
          orderBy: [{ openedAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.shiftSession.count({ where }),
      ]);
      return {
        data: sessions.map((session) => this.toResponse(session)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  private async currentBusinessDay(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
  ): Promise<BusinessDay> {
    const businessDay = await tx.businessDay.findFirst({
      where: { tenantId, outletId, status: BusinessDayStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
    if (!businessDay) {
      throw new NotFoundException('Open business day not found for outlet');
    }
    return businessDay;
  }

  private async findAssignedEmployee(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    userId: string,
  ) {
    const employee = await tx.employeeProfile.findFirst({
      where: {
        tenantId,
        outletId,
        userId,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException('Active employee profile not found for assigned user');
    }
    return employee;
  }

  private async resolveAssignedShiftId(
    tx: Prisma.TransactionClient,
    employeeId: string,
    businessDate: Date,
  ): Promise<string | null> {
    const assignment = await tx.employeeShiftAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: businessDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: businessDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      select: { shiftId: true },
    });
    return assignment?.shiftId ?? null;
  }

  private async assertShiftTemplate(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    shiftId: string,
  ): Promise<void> {
    const shift = await tx.shift.findFirst({
      where: { tenantId, outletId, id: shiftId, isActive: true },
      select: { id: true },
    });
    if (!shift) {
      throw new NotFoundException('Active shift template not found');
    }
  }

  private async findSession(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<ShiftSession> {
    const session = await tx.shiftSession.findFirst({ where: { tenantId, id } });
    if (!session) {
      throw new NotFoundException('Shift session not found');
    }
    return session;
  }

  private async lockAssignedUser(
    tx: Prisma.TransactionClient,
    tenantId: string,
    assignedUserId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId || ''} || ':shift:' || ${assignedUserId || ''}))`;
  }

  private async auditShiftSession(
    tx: Prisma.TransactionClient,
    session: ShiftSession,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: session.tenantId,
      outletId: session.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'ShiftSession',
      targetId: session.id,
      result: AuditResult.SUCCESS,
      metadata: {
        businessDayId: session.businessDayId,
        assignedUserId: session.assignedUserId,
        shiftId: session.shiftId,
        status: session.status,
        version: session.version,
      },
      ...request,
    });
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toResponse(session: ShiftSession) {
    return {
      id: session.id,
      tenantId: session.tenantId,
      outletId: session.outletId,
      businessDayId: session.businessDayId,
      assignedUserId: session.assignedUserId,
      shiftId: session.shiftId,
      status: session.status,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      openedByUserId: session.openedByUserId,
      closedByUserId: session.closedByUserId,
      openingNotes: session.openingNotes,
      closingNotes: session.closingNotes,
      version: session.version,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
