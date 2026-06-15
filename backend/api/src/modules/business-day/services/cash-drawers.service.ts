import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  CashDrawerStatus,
  CashDrawerTransactionType,
  ShiftSessionStatus,
  Prisma,
  type CashDrawer,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  CashDrawerQueryDto,
  CloseCashDrawerDto,
  CreateCashDrawerTransactionDto,
  CurrentCashDrawerQueryDto,
  OpenCashDrawerDto,
  TenantCashDrawerQueryDto,
} from '../dto/cash-drawer.dto';
import {
  assertOutletAccess,
  assertShiftActorCanAssign,
  canManageOperationalScope,
  requireCashDrawerAdjust,
  requireCashDrawerClose,
  requireCashDrawerOpen,
  requireCashDrawerRead,
  resolveBusinessDayScope,
} from './business-day-access.util';

type ShiftSessionRecord = {
  id: string;
  tenantId: string;
  outletId: string;
  businessDayId: string;
  assignedUserId: string;
  status: ShiftSessionStatus;
};

@Injectable()
export class CashDrawersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async open(dto: OpenCashDrawerDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireCashDrawerOpen(actor);
    const scope = resolveBusinessDayScope(actor, dto.tenantId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const shiftSession = await this.findOpenShiftSession(tx, scope.tenantId, dto.shiftSessionId);
      assertOutletAccess(actor, shiftSession.outletId);
      assertShiftActorCanAssign(actor, shiftSession.assignedUserId);
      await this.lockShiftSession(tx, scope.tenantId, shiftSession.id);
      const active = await tx.cashDrawer.findFirst({
        where: {
          tenantId: scope.tenantId,
          shiftSessionId: shiftSession.id,
          status: CashDrawerStatus.OPEN,
        },
        select: { id: true },
      });
      if (active) {
        throw new ConflictException('Shift session already has an active cash drawer');
      }
      const drawer = await tx.cashDrawer.create({
        data: {
          tenantId: scope.tenantId,
          outletId: shiftSession.outletId,
          businessDayId: shiftSession.businessDayId,
          shiftSessionId: shiftSession.id,
          currencyCode: dto.currencyCode ?? 'INR',
          openingBalanceMinor: dto.openingBalanceMinor,
          expectedCashMinor: dto.openingBalanceMinor,
          openedByUserId: actor.id,
          openingNotes: this.optionalText(dto.openingNotes),
        },
      });
      await tx.cashDrawerTransaction.create({
        data: {
          tenantId: drawer.tenantId,
          outletId: drawer.outletId,
          businessDayId: drawer.businessDayId,
          cashDrawerId: drawer.id,
          transactionType: CashDrawerTransactionType.OPENING_BALANCE,
          amountMinor: drawer.openingBalanceMinor,
          balanceAfter: drawer.expectedCashMinor,
          recordedByUserId: actor.id,
          note: this.optionalText(dto.openingNotes),
        },
      });
      await this.auditDrawer(tx, drawer, actor, request, 'cash_drawer.opened');
      return this.toResponse(drawer);
    });
  }

  async addTransaction(
    id: string,
    dto: CreateCashDrawerTransactionDto,
    query: TenantCashDrawerQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCashDrawerAdjust(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    if (
      dto.transactionType === CashDrawerTransactionType.OPENING_BALANCE ||
      dto.transactionType === CashDrawerTransactionType.CLOSING_BALANCE
    ) {
      throw new BadRequestException('Opening and closing balances are lifecycle commands');
    }

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const drawer = await this.findDrawer(tx, scope.tenantId, id);
      assertOutletAccess(actor, drawer.outletId);
      const shiftSession = await this.findShiftSession(tx, scope.tenantId, drawer.shiftSessionId);
      assertShiftActorCanAssign(actor, shiftSession.assignedUserId);
      await this.lockShiftSession(tx, scope.tenantId, drawer.shiftSessionId);
      if (drawer.status !== CashDrawerStatus.OPEN) {
        throw new ConflictException('Cash drawer is closed');
      }
      const nextBalance = this.nextBalance(drawer.expectedCashMinor, dto);
      const transaction = await tx.cashDrawerTransaction.create({
        data: {
          tenantId: drawer.tenantId,
          outletId: drawer.outletId,
          businessDayId: drawer.businessDayId,
          cashDrawerId: drawer.id,
          transactionType: dto.transactionType,
          amountMinor: dto.amountMinor,
          balanceAfter: nextBalance,
          recordedByUserId: actor.id,
          note: this.optionalText(dto.note),
        },
      });
      const updated = await tx.cashDrawer.update({
        where: { id: drawer.id },
        data: {
          expectedCashMinor: nextBalance,
          version: { increment: 1 },
        },
      });
      await this.auditDrawer(tx, updated, actor, request, 'cash_drawer.transaction_recorded', {
        transactionId: transaction.id,
        transactionType: transaction.transactionType,
        amountMinor: transaction.amountMinor,
        balanceAfter: transaction.balanceAfter,
      });
      return {
        drawer: this.toResponse(updated),
        transaction: this.transactionResponse(transaction),
      };
    });
  }

  async close(
    id: string,
    dto: CloseCashDrawerDto,
    query: TenantCashDrawerQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCashDrawerClose(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const drawer = await this.findDrawer(tx, scope.tenantId, id);
      assertOutletAccess(actor, drawer.outletId);
      const shiftSession = await this.findShiftSession(tx, scope.tenantId, drawer.shiftSessionId);
      assertShiftActorCanAssign(actor, shiftSession.assignedUserId);
      await this.lockShiftSession(tx, scope.tenantId, drawer.shiftSessionId);
      if (drawer.status !== CashDrawerStatus.OPEN) {
        throw new ConflictException('Cash drawer is already closed');
      }
      const closed = await tx.cashDrawer.updateMany({
        where: {
          tenantId: scope.tenantId,
          id,
          version: dto.version,
          status: CashDrawerStatus.OPEN,
        },
        data: {
          status: CashDrawerStatus.CLOSED,
          closedAt: new Date(),
          closedByUserId: actor.id,
          closingBalanceMinor: dto.closingBalanceMinor,
          closingNotes: this.optionalText(dto.closingNotes),
          version: { increment: 1 },
        },
      });
      if (closed.count !== 1) {
        throw new ConflictException('Cash drawer was updated by another request');
      }
      const updated = await this.findDrawer(tx, scope.tenantId, id);
      const transaction = await tx.cashDrawerTransaction.create({
        data: {
          tenantId: updated.tenantId,
          outletId: updated.outletId,
          businessDayId: updated.businessDayId,
          cashDrawerId: updated.id,
          transactionType: CashDrawerTransactionType.CLOSING_BALANCE,
          amountMinor: dto.closingBalanceMinor,
          balanceAfter: dto.closingBalanceMinor,
          recordedByUserId: actor.id,
          note: this.optionalText(dto.closingNotes),
        },
      });
      await this.auditDrawer(tx, updated, actor, request, 'cash_drawer.closed', {
        closingBalanceMinor: dto.closingBalanceMinor,
        expectedCashMinor: drawer.expectedCashMinor,
        varianceMinor: dto.closingBalanceMinor - drawer.expectedCashMinor,
        transactionId: transaction.id,
      });
      return this.toResponse(updated);
    });
  }

  async current(query: CurrentCashDrawerQueryDto, actor: AuthenticatedUser) {
    requireCashDrawerRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const drawer = await tx.cashDrawer.findFirst({
        where: {
          tenantId: scope.tenantId,
          shiftSessionId: query.shiftSessionId,
          status: CashDrawerStatus.OPEN,
        },
        orderBy: { openedAt: 'desc' },
      });
      if (!drawer) {
        throw new NotFoundException('Current cash drawer not found');
      }
      assertOutletAccess(actor, drawer.outletId);
      const shiftSession = await this.findShiftSession(tx, scope.tenantId, drawer.shiftSessionId);
      assertShiftActorCanAssign(actor, shiftSession.assignedUserId);
      return this.toResponse(drawer);
    });
  }

  async list(query: CashDrawerQueryDto, actor: AuthenticatedUser) {
    requireCashDrawerRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    if (query.outletId) {
      assertOutletAccess(actor, query.outletId);
    } else if (actor.outletId !== null) {
      query.outletId = actor.outletId;
    }
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.CashDrawerWhereInput = {
        tenantId: scope.tenantId,
        ...(query.outletId ? { outletId: query.outletId } : {}),
        ...(query.businessDayId ? { businessDayId: query.businessDayId } : {}),
        ...(query.shiftSessionId ? { shiftSessionId: query.shiftSessionId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(canManageOperationalScope(actor) ? {} : { shiftSession: { assignedUserId: actor.id } }),
      };
      const [drawers, total] = await Promise.all([
        tx.cashDrawer.findMany({
          where,
          orderBy: [{ openedAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.cashDrawer.count({ where }),
      ]);
      return {
        data: drawers.map((drawer) => this.toResponse(drawer)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async transactions(id: string, query: TenantCashDrawerQueryDto, actor: AuthenticatedUser) {
    requireCashDrawerRead(actor);
    const scope = resolveBusinessDayScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const drawer = await this.findDrawer(tx, scope.tenantId, id);
      assertOutletAccess(actor, drawer.outletId);
      const shiftSession = await this.findShiftSession(tx, scope.tenantId, drawer.shiftSessionId);
      assertShiftActorCanAssign(actor, shiftSession.assignedUserId);
      const transactions = await tx.cashDrawerTransaction.findMany({
        where: { tenantId: scope.tenantId, cashDrawerId: id },
        orderBy: { recordedAt: 'asc' },
      });
      return transactions.map((transaction) => this.transactionResponse(transaction));
    });
  }

  private async findOpenShiftSession(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<ShiftSessionRecord> {
    const session = await this.findShiftSession(tx, tenantId, id);
    if (session.status !== ShiftSessionStatus.OPEN) {
      throw new ConflictException('Cash drawers can only be opened for active shift sessions');
    }
    return session;
  }

  private async findShiftSession(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<ShiftSessionRecord> {
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

  private async findDrawer(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<CashDrawer> {
    const drawer = await tx.cashDrawer.findFirst({ where: { tenantId, id } });
    if (!drawer) {
      throw new NotFoundException('Cash drawer not found');
    }
    return drawer;
  }

  private nextBalance(current: number, dto: CreateCashDrawerTransactionDto): number {
    if (dto.transactionType === CashDrawerTransactionType.CASH_OUT) {
      if (dto.amountMinor > current) {
        throw new BadRequestException('Cash out amount exceeds expected drawer cash');
      }
      return current - dto.amountMinor;
    }
    return current + dto.amountMinor;
  }

  private async lockShiftSession(
    tx: Prisma.TransactionClient,
    tenantId: string,
    shiftSessionId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId || ''} || ':drawer:' || ${shiftSessionId || ''}))`;
  }

  private async auditDrawer(
    tx: Prisma.TransactionClient,
    drawer: CashDrawer,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: drawer.tenantId,
      outletId: drawer.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'CashDrawer',
      targetId: drawer.id,
      result: AuditResult.SUCCESS,
      metadata: {
        businessDayId: drawer.businessDayId,
        shiftSessionId: drawer.shiftSessionId,
        status: drawer.status,
        currencyCode: drawer.currencyCode,
        expectedCashMinor: drawer.expectedCashMinor,
        version: drawer.version,
        ...extra,
      },
      ...request,
    });
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toResponse(drawer: CashDrawer) {
    return {
      id: drawer.id,
      tenantId: drawer.tenantId,
      outletId: drawer.outletId,
      businessDayId: drawer.businessDayId,
      shiftSessionId: drawer.shiftSessionId,
      currencyCode: drawer.currencyCode,
      status: drawer.status,
      openingBalanceMinor: drawer.openingBalanceMinor,
      expectedCashMinor: drawer.expectedCashMinor,
      closingBalanceMinor: drawer.closingBalanceMinor,
      openedAt: drawer.openedAt.toISOString(),
      closedAt: drawer.closedAt?.toISOString() ?? null,
      openedByUserId: drawer.openedByUserId,
      closedByUserId: drawer.closedByUserId,
      openingNotes: drawer.openingNotes,
      closingNotes: drawer.closingNotes,
      version: drawer.version,
      createdAt: drawer.createdAt.toISOString(),
      updatedAt: drawer.updatedAt.toISOString(),
    };
  }

  private transactionResponse(transaction: {
    id: string;
    tenantId: string;
    outletId: string;
    businessDayId: string;
    cashDrawerId: string;
    transactionType: CashDrawerTransactionType;
    amountMinor: number;
    balanceAfter: number;
    note: string | null;
    recordedByUserId: string;
    recordedAt: Date;
  }) {
    return {
      id: transaction.id,
      tenantId: transaction.tenantId,
      outletId: transaction.outletId,
      businessDayId: transaction.businessDayId,
      cashDrawerId: transaction.cashDrawerId,
      transactionType: transaction.transactionType,
      amountMinor: transaction.amountMinor,
      balanceAfter: transaction.balanceAfter,
      note: transaction.note,
      recordedByUserId: transaction.recordedByUserId,
      recordedAt: transaction.recordedAt.toISOString(),
    };
  }
}
