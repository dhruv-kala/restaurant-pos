import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  AuditResult,
  CashDrawerStatus,
  CashDrawerTransactionType,
  ShiftSessionStatus,
} from '@prisma/client';

import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuditService } from '../../audit/services/audit.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CashDrawersService } from './cash-drawers.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const businessDayId = '01975c30-0000-7000-8000-000000000300';
const shiftSessionId = '01975c30-0000-7000-8000-000000000400';
const drawerId = '01975c30-0000-7000-8000-000000000500';
const actorId = '01975c30-0000-7000-8000-000000000001';

const actor: AuthenticatedUser = {
  id: actorId,
  email: 'cashier@example.test',
  name: 'Cashier',
  tenantId,
  outletId,
  roles: ['CASHIER'],
  permissions: ['cash_drawer.read', 'cash_drawer.open', 'cash_drawer.adjust', 'cash_drawer.close'],
};

describe('CashDrawersService', () => {
  it('opens a drawer for an active shift and records opening balance transaction', async () => {
    const append = jest.fn().mockResolvedValue({});
    const tx = txMock({
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(drawer()),
      },
      cashDrawerTransaction: { create: jest.fn().mockResolvedValue(transaction()) },
    });
    const service = new CashDrawersService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const response = await service.open(
      { shiftSessionId, openingBalanceMinor: 5000, openingNotes: 'Start cash' },
      actor,
      {},
    );

    expect(response).toMatchObject({
      id: drawerId,
      shiftSessionId,
      openingBalanceMinor: 5000,
      expectedCashMinor: 5000,
      status: CashDrawerStatus.OPEN,
    });
    expect(tx.cashDrawer.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        outletId,
        businessDayId,
        shiftSessionId,
        currencyCode: 'INR',
        openingBalanceMinor: 5000,
        expectedCashMinor: 5000,
        openedByUserId: actorId,
        openingNotes: 'Start cash',
      },
    });
    expect(tx.cashDrawerTransaction.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        outletId,
        businessDayId,
        cashDrawerId: drawerId,
        transactionType: CashDrawerTransactionType.OPENING_BALANCE,
        amountMinor: 5000,
        balanceAfter: 5000,
        recordedByUserId: actorId,
        note: 'Start cash',
      },
    });
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'cash_drawer.opened', targetId: drawerId }),
    );
  });

  it('rejects opening when the shift already has an active drawer', async () => {
    const tx = txMock({
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawer: { findFirst: jest.fn().mockResolvedValue({ id: drawerId }), create: jest.fn() },
    });
    const service = new CashDrawersService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.open({ shiftSessionId, openingBalanceMinor: 1000 }, actor, {}),
    ).rejects.toThrow(ConflictException);
    expect(tx.cashDrawer.create).not.toHaveBeenCalled();
  });

  it('records a cash-in transaction and updates expected cash', async () => {
    const append = jest.fn().mockResolvedValue({});
    const tx = txMock({
      cashDrawer: {
        findFirst: jest.fn().mockResolvedValue(drawer({ expectedCashMinor: 5000 })),
        update: jest.fn().mockResolvedValue(drawer({ expectedCashMinor: 6200, version: 2 })),
      },
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawerTransaction: {
        create: jest.fn().mockResolvedValue(
          transaction({
            transactionType: CashDrawerTransactionType.CASH_IN,
            amountMinor: 1200,
            balanceAfter: 6200,
          }),
        ),
      },
    });
    const service = new CashDrawersService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const response = await service.addTransaction(
      drawerId,
      { transactionType: CashDrawerTransactionType.CASH_IN, amountMinor: 1200 },
      {},
      actor,
      {},
    );

    expect(response.drawer).toMatchObject({ expectedCashMinor: 6200, version: 2 });
    expect(tx.cashDrawer.update).toHaveBeenCalledWith({
      where: { id: drawerId },
      data: { expectedCashMinor: 6200, version: { increment: 1 } },
    });
  });

  it('rejects cash out above expected drawer cash', async () => {
    const tx = txMock({
      cashDrawer: { findFirst: jest.fn().mockResolvedValue(drawer({ expectedCashMinor: 500 })) },
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
    });
    const service = new CashDrawersService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.addTransaction(
        drawerId,
        { transactionType: CashDrawerTransactionType.CASH_OUT, amountMinor: 600 },
        {},
        actor,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns append-only transaction history', async () => {
    const tx = txMock({
      cashDrawer: { findFirst: jest.fn().mockResolvedValue(drawer()) },
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawerTransaction: { findMany: jest.fn().mockResolvedValue([transaction()]) },
    });
    const service = new CashDrawersService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.transactions(drawerId, {}, actor)).resolves.toHaveLength(1);
    expect(tx.cashDrawerTransaction.findMany).toHaveBeenCalledWith({
      where: { tenantId, cashDrawerId: drawerId },
      orderBy: { recordedAt: 'asc' },
    });
  });

  it('closes a drawer with counted balance and records closing transaction', async () => {
    const append = jest.fn().mockResolvedValue({});
    const openDrawer = drawer({ expectedCashMinor: 6200 });
    const closedDrawer = drawer({
      status: CashDrawerStatus.CLOSED,
      closingBalanceMinor: 6100,
      closedAt: new Date('2026-06-15T18:00:00.000Z'),
      closedByUserId: actorId,
      version: 2,
    });
    const tx = txMock({
      cashDrawer: {
        findFirst: jest.fn().mockResolvedValueOnce(openDrawer).mockResolvedValueOnce(closedDrawer),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawerTransaction: { create: jest.fn().mockResolvedValue(transaction()) },
    });
    const service = new CashDrawersService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const response = await service.close(
      drawerId,
      { version: 1, closingBalanceMinor: 6100, closingNotes: 'Short by 100' },
      {},
      actor,
      {},
    );

    expect(response).toMatchObject({ status: CashDrawerStatus.CLOSED, closingBalanceMinor: 6100 });
    expect(tx.cashDrawer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, id: drawerId, version: 1, status: CashDrawerStatus.OPEN },
      }),
    );
    expect(tx.cashDrawerTransaction.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        outletId,
        businessDayId,
        cashDrawerId: drawerId,
        transactionType: CashDrawerTransactionType.CLOSING_BALANCE,
        amountMinor: 6100,
        balanceAfter: 6100,
        recordedByUserId: actorId,
        note: 'Short by 100',
      },
    });
    expect(append).toHaveBeenCalledWith(tx, {
      tenantId,
      outletId,
      actorUserId: actorId,
      actorRoles: actor.roles,
      action: 'cash_drawer.closed',
      targetType: 'CashDrawer',
      targetId: drawerId,
      result: AuditResult.SUCCESS,
      metadata: {
        businessDayId,
        shiftSessionId,
        status: CashDrawerStatus.CLOSED,
        currencyCode: 'INR',
        expectedCashMinor: 6200,
        version: 2,
        closingBalanceMinor: 6100,
        varianceMinor: -100,
        transactionId: '01975c30-0000-7000-8000-000000000700',
      },
    });
  });

  it('rejects close when expected version does not match', async () => {
    const tx = txMock({
      cashDrawer: {
        findFirst: jest.fn().mockResolvedValue(drawer()),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
    });
    const service = new CashDrawersService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.close(drawerId, { version: 1, closingBalanceMinor: 5000 }, {}, actor, {}),
    ).rejects.toThrow(ConflictException);
  });
});

function shiftSession() {
  return {
    id: shiftSessionId,
    tenantId,
    outletId,
    businessDayId,
    assignedUserId: actorId,
    status: ShiftSessionStatus.OPEN,
  };
}

function drawer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: drawerId,
    tenantId,
    outletId,
    businessDayId,
    shiftSessionId,
    currencyCode: 'INR',
    status: CashDrawerStatus.OPEN,
    openingBalanceMinor: 5000,
    expectedCashMinor: 5000,
    closingBalanceMinor: null,
    openedAt: new Date('2026-06-15T09:00:00.000Z'),
    closedAt: null,
    openedByUserId: actorId,
    closedByUserId: null,
    openingNotes: null,
    closingNotes: null,
    version: 1,
    createdAt: new Date('2026-06-15T09:00:00.000Z'),
    updatedAt: new Date('2026-06-15T09:00:00.000Z'),
    ...overrides,
  };
}

function transaction(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '01975c30-0000-7000-8000-000000000700',
    tenantId,
    outletId,
    businessDayId,
    cashDrawerId: drawerId,
    transactionType: CashDrawerTransactionType.OPENING_BALANCE,
    amountMinor: 5000,
    balanceAfter: 5000,
    note: null,
    recordedByUserId: actorId,
    recordedAt: new Date('2026-06-15T09:00:00.000Z'),
    ...overrides,
  };
}

function txMock(overrides: Record<string, unknown>) {
  return {
    $queryRaw: jest.fn(),
    shiftSession: { findFirst: jest.fn() },
    cashDrawer: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cashDrawerTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    ...overrides,
  };
}

function transactionalPrisma(tx: unknown): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: unknown) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}
