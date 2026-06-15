import { BadRequestException, ConflictException } from '@nestjs/common';
import { CashDrawerStatus, ShiftSessionStatus } from '@prisma/client';

import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuditService } from '../../audit/services/audit.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ShiftReconciliationsService } from './shift-reconciliations.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const actorId = '01975c30-0000-7000-8000-000000000001';
const businessDayId = '01975c30-0000-7000-8000-000000000300';
const sessionId = '01975c30-0000-7000-8000-000000000400';
const drawerId = '01975c30-0000-7000-8000-000000000500';
const reconciliationId = '01975c30-0000-7000-8000-000000000600';

const actor: AuthenticatedUser = {
  id: actorId,
  email: 'cashier@example.test',
  name: 'Cashier',
  tenantId,
  outletId,
  roles: ['CASHIER'],
  permissions: ['shift_reconciliation.read', 'shift_reconciliation.create'],
};

describe('ShiftReconciliationsService', () => {
  it('records an immutable reconciliation from a closed drawer and audits variance', async () => {
    const append = jest.fn().mockResolvedValue({});
    const tx = txMock({
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawer: { findFirst: jest.fn().mockResolvedValue(cashDrawer()) },
      shiftReconciliation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(
          reconciliation({
            countedCashMinor: 12_500,
            varianceMinor: 500,
            approvalNotes: 'Manager approved overage',
          }),
        ),
      },
    });
    const service = new ShiftReconciliationsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const response = await service.create(
      {
        shiftSessionId: sessionId,
        cashDrawerId: drawerId,
        countedCashMinor: 12_500,
        approvalNotes: 'Manager approved overage',
      },
      actor,
      {},
    );

    expect(response).toMatchObject({
      id: reconciliationId,
      shiftSessionId: sessionId,
      cashDrawerId: drawerId,
      expectedCashMinor: 12_000,
      countedCashMinor: 12_500,
      varianceMinor: 500,
    });
    expect(tx.shiftReconciliation.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        outletId,
        businessDayId,
        shiftSessionId: sessionId,
        cashDrawerId: drawerId,
        currencyCode: 'INR',
        expectedCashMinor: 12_000,
        countedCashMinor: 12_500,
        varianceMinor: 500,
        approvalNotes: 'Manager approved overage',
        reconciledByUserId: actorId,
      },
    });
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'shift_reconciliation.recorded',
        targetType: 'ShiftReconciliation',
        targetId: reconciliationId,
      }),
    );
  });

  it('rejects non-zero variance without approval notes', async () => {
    const tx = txMock({
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawer: { findFirst: jest.fn().mockResolvedValue(cashDrawer()) },
      shiftReconciliation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    });
    const service = new ShiftReconciliationsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.create(
        { shiftSessionId: sessionId, cashDrawerId: drawerId, countedCashMinor: 11_500 },
        actor,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
    expect(tx.shiftReconciliation.create).not.toHaveBeenCalled();
  });

  it('rejects reconciliation before the drawer is closed', async () => {
    const tx = txMock({
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawer: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            cashDrawer({ status: CashDrawerStatus.OPEN, closingBalanceMinor: null }),
          ),
      },
      shiftReconciliation: { findFirst: jest.fn(), create: jest.fn() },
    });
    const service = new ShiftReconciliationsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.create(
        { shiftSessionId: sessionId, cashDrawerId: drawerId, countedCashMinor: 12_000 },
        actor,
        {},
      ),
    ).rejects.toThrow(ConflictException);
    expect(tx.shiftReconciliation.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate reconciliation for the same shift session', async () => {
    const tx = txMock({
      shiftSession: { findFirst: jest.fn().mockResolvedValue(shiftSession()) },
      cashDrawer: { findFirst: jest.fn().mockResolvedValue(cashDrawer()) },
      shiftReconciliation: {
        findFirst: jest.fn().mockResolvedValue({ id: reconciliationId }),
        create: jest.fn(),
      },
    });
    const service = new ShiftReconciliationsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.create(
        { shiftSessionId: sessionId, cashDrawerId: drawerId, countedCashMinor: 12_000 },
        actor,
        {},
      ),
    ).rejects.toThrow(ConflictException);
    expect(tx.shiftReconciliation.create).not.toHaveBeenCalled();
  });
});

function shiftSession() {
  return {
    id: sessionId,
    tenantId,
    outletId,
    businessDayId,
    assignedUserId: actorId,
    status: ShiftSessionStatus.OPEN,
  };
}

function cashDrawer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: drawerId,
    tenantId,
    outletId,
    businessDayId,
    shiftSessionId: sessionId,
    currencyCode: 'INR',
    status: CashDrawerStatus.CLOSED,
    openingBalanceMinor: 10_000,
    expectedCashMinor: 12_000,
    closingBalanceMinor: 12_000,
    openedAt: new Date('2026-06-15T09:00:00.000Z'),
    closedAt: new Date('2026-06-15T17:55:00.000Z'),
    openedByUserId: actorId,
    closedByUserId: actorId,
    openingNotes: null,
    closingNotes: null,
    version: 2,
    createdAt: new Date('2026-06-15T09:00:00.000Z'),
    updatedAt: new Date('2026-06-15T17:55:00.000Z'),
    ...overrides,
  };
}

function reconciliation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: reconciliationId,
    tenantId,
    outletId,
    businessDayId,
    shiftSessionId: sessionId,
    cashDrawerId: drawerId,
    currencyCode: 'INR',
    expectedCashMinor: 12_000,
    countedCashMinor: 12_000,
    varianceMinor: 0,
    approvalNotes: null,
    reconciledByUserId: actorId,
    reconciledAt: new Date('2026-06-15T17:58:00.000Z'),
    createdAt: new Date('2026-06-15T17:58:00.000Z'),
    ...overrides,
  };
}

function txMock(overrides: Record<string, unknown>) {
  return {
    $queryRaw: jest.fn(),
    shiftSession: { findFirst: jest.fn() },
    cashDrawer: { findFirst: jest.fn() },
    shiftReconciliation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
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
