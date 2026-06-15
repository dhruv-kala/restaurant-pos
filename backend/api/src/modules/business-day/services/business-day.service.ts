import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  BusinessDayStatus,
  OutletStatus,
  Prisma,
  type BusinessDay,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  BusinessDayQueryDto,
  CloseBusinessDayDto,
  CurrentBusinessDayQueryDto,
  OpenBusinessDayDto,
  TenantBusinessDayQueryDto,
} from '../dto/business-day.dto';
import {
  assertOutletAccess,
  requireBusinessDayClose,
  requireBusinessDayOpen,
  requireBusinessDayRead,
  resolveBusinessDayScope,
  type BusinessDayScope,
} from './business-day-access.util';

@Injectable()
export class BusinessDayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async open(dto: OpenBusinessDayDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireBusinessDayOpen(actor);
    const scope = resolveBusinessDayScope(actor, dto.tenantId);
    assertOutletAccess(actor, dto.outletId);
    const businessDate = this.parseBusinessDate(dto.businessDate);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockOutlet(tx, scope.tenantId, dto.outletId);
      await this.assertOutlet(tx, scope.tenantId, dto.outletId, true);
      const active = await tx.businessDay.findFirst({
        where: {
          tenantId: scope.tenantId,
          outletId: dto.outletId,
          status: BusinessDayStatus.OPEN,
        },
        select: { id: true, businessDate: true },
      });
      if (active) {
        throw new ConflictException('An active business day already exists for this outlet');
      }
      const duplicateDate = await tx.businessDay.findUnique({
        where: {
          tenantId_outletId_businessDate: {
            tenantId: scope.tenantId,
            outletId: dto.outletId,
            businessDate,
          },
        },
        select: { id: true },
      });
      if (duplicateDate) {
        throw new ConflictException('Business day already exists for this outlet and date');
      }
      const businessDay = await tx.businessDay.create({
        data: {
          tenantId: scope.tenantId,
          outletId: dto.outletId,
          businessDate,
          openedByUserId: actor.id,
          openingNotes: this.optionalText(dto.openingNotes),
        },
      });
      await this.auditBusinessDay(tx, businessDay, actor, request, 'business_day.opened');
      return this.toResponse(businessDay);
    });
  }

  async close(
    id: string,
    dto: CloseBusinessDayDto,
    query: TenantBusinessDayQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireBusinessDayClose(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findBusinessDay(tx, scope.tenantId, id);
      assertOutletAccess(actor, existing.outletId);
      await this.lockOutlet(tx, scope.tenantId, existing.outletId);
      if (existing.status !== BusinessDayStatus.OPEN) {
        throw new ConflictException('Business day is already closed');
      }
      const updatedCount = await tx.businessDay.updateMany({
        where: {
          tenantId: scope.tenantId,
          id,
          version: dto.version,
          status: BusinessDayStatus.OPEN,
        },
        data: {
          status: BusinessDayStatus.CLOSED,
          closedAt: new Date(),
          closedByUserId: actor.id,
          closingNotes: this.optionalText(dto.closingNotes),
          version: { increment: 1 },
        },
      });
      if (updatedCount.count !== 1) {
        throw new ConflictException('Business day was updated by another request');
      }
      const closed = await this.findBusinessDay(tx, scope.tenantId, id);
      await this.auditBusinessDay(tx, closed, actor, request, 'business_day.closed');
      return this.toResponse(closed);
    });
  }

  async current(query: CurrentBusinessDayQueryDto, actor: AuthenticatedUser) {
    requireBusinessDayRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    assertOutletAccess(actor, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.assertOutlet(tx, scope.tenantId, query.outletId, false);
      const businessDay = await tx.businessDay.findFirst({
        where: {
          tenantId: scope.tenantId,
          outletId: query.outletId,
          status: BusinessDayStatus.OPEN,
        },
        orderBy: { openedAt: 'desc' },
      });
      if (!businessDay) {
        throw new NotFoundException('Current business day not found');
      }
      return this.toResponse(businessDay);
    });
  }

  async list(query: BusinessDayQueryDto, actor: AuthenticatedUser) {
    requireBusinessDayRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    if (query.outletId) {
      assertOutletAccess(actor, query.outletId);
    } else if (actor.outletId !== null) {
      query.outletId = actor.outletId;
    }

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.where(query, scope);
      const [days, total] = await Promise.all([
        tx.businessDay.findMany({
          where,
          orderBy: [{ businessDate: 'desc' }, { openedAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.businessDay.count({ where }),
      ]);
      return {
        data: days.map((day) => this.toResponse(day)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  private where(query: BusinessDayQueryDto, scope: BusinessDayScope): Prisma.BusinessDayWhereInput {
    return {
      tenantId: scope.tenantId,
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.businessDate ? { businessDate: this.parseBusinessDate(query.businessDate) } : {}),
    };
  }

  private async assertOutlet(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    requireActive: boolean,
  ): Promise<void> {
    const outlet = await tx.outlet.findFirst({
      where: {
        tenantId,
        id: outletId,
        deletedAt: null,
      },
      select: { id: true, status: true },
    });
    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }
    if (requireActive && outlet.status !== OutletStatus.ACTIVE) {
      throw new BadRequestException('Business days can only be opened for active outlets');
    }
  }

  private async findBusinessDay(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<BusinessDay> {
    const businessDay = await tx.businessDay.findFirst({ where: { tenantId, id } });
    if (!businessDay) {
      throw new NotFoundException('Business day not found');
    }
    return businessDay;
  }

  private async lockOutlet(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId || ''} || ':' || ${outletId || ''}))`;
  }

  private async auditBusinessDay(
    tx: Prisma.TransactionClient,
    businessDay: BusinessDay,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: businessDay.tenantId,
      outletId: businessDay.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'BusinessDay',
      targetId: businessDay.id,
      result: AuditResult.SUCCESS,
      metadata: {
        businessDate: this.isoDate(businessDay.businessDate),
        status: businessDay.status,
        version: businessDay.version,
      },
      ...request,
    });
  }

  private parseBusinessDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('businessDate must be an ISO date');
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('Invalid businessDate');
    }
    return parsed;
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toResponse(day: BusinessDay) {
    return {
      id: day.id,
      tenantId: day.tenantId,
      outletId: day.outletId,
      businessDate: this.isoDate(day.businessDate),
      status: day.status,
      openedAt: day.openedAt.toISOString(),
      closedAt: day.closedAt?.toISOString() ?? null,
      openedByUserId: day.openedByUserId,
      closedByUserId: day.closedByUserId,
      openingNotes: day.openingNotes,
      closingNotes: day.closingNotes,
      version: day.version,
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
    };
  }

  private isoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
