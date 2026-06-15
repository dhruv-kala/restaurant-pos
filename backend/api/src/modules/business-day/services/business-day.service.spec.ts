import { ConflictException } from '@nestjs/common';
import { BusinessDayStatus, OutletStatus } from '@prisma/client';

import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuditService } from '../../audit/services/audit.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { BusinessDayService } from './business-day.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const actorId = '01975c30-0000-7000-8000-000000000001';
const businessDayId = '01975c30-0000-7000-8000-000000000300';
const closingId = '01975c30-0000-7000-8000-000000000700';

const actor: AuthenticatedUser = {
  id: actorId,
  email: 'manager@example.test',
  name: 'Manager',
  tenantId,
  outletId,
  roles: ['MANAGER'],
  permissions: [],
};

describe('BusinessDayService', () => {
  it('opens a business day and appends an audit event', async () => {
    const append = jest.fn().mockResolvedValue({});
    const tx = txMock({
      outlet: {
        findFirst: jest.fn().mockResolvedValue({ id: outletId, status: OutletStatus.ACTIVE }),
      },
      businessDay: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(day()),
      },
      auditEvent: {},
    });
    const service = new BusinessDayService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const response = await service.open(
      { outletId, businessDate: '2026-06-15', openingNotes: 'Morning open' },
      actor,
      { ipAddress: '127.0.0.1' },
    );

    expect(response).toMatchObject({
      id: businessDayId,
      tenantId,
      outletId,
      businessDate: '2026-06-15',
      status: BusinessDayStatus.OPEN,
    });
    expect(tx.businessDay.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        outletId,
        businessDate: new Date('2026-06-15T00:00:00.000Z'),
        openedByUserId: actorId,
        openingNotes: 'Morning open',
      },
    });
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId,
        outletId,
        actorUserId: actorId,
        action: 'business_day.opened',
        targetType: 'BusinessDay',
        targetId: businessDayId,
      }),
    );
  });

  it('rejects opening when the outlet already has an active business day', async () => {
    const tx = txMock({
      outlet: {
        findFirst: jest.fn().mockResolvedValue({ id: outletId, status: OutletStatus.ACTIVE }),
      },
      businessDay: {
        findFirst: jest.fn().mockResolvedValue({ id: businessDayId }),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    });
    const service = new BusinessDayService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.open({ outletId, businessDate: '2026-06-15' }, actor, {})).rejects.toThrow(
      ConflictException,
    );
    expect(tx.businessDay.create).not.toHaveBeenCalled();
  });

  it('returns the current open business day for an outlet', async () => {
    const tx = txMock({
      outlet: {
        findFirst: jest.fn().mockResolvedValue({ id: outletId, status: OutletStatus.ACTIVE }),
      },
      businessDay: { findFirst: jest.fn().mockResolvedValue(day()) },
    });
    const service = new BusinessDayService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.current({ outletId }, actor)).resolves.toMatchObject({
      id: businessDayId,
      status: BusinessDayStatus.OPEN,
    });
    expect(tx.businessDay.findFirst).toHaveBeenCalledWith({
      where: { tenantId, outletId, status: BusinessDayStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
  });

  it('closes an open business day with optimistic concurrency and audit', async () => {
    const append = jest.fn().mockResolvedValue({});
    const openDay = day();
    const closedDay = day({
      status: BusinessDayStatus.CLOSED,
      closedAt: new Date('2026-06-15T22:00:00.000Z'),
      closedByUserId: actorId,
      version: 2,
    });
    const tx = txMock({
      businessDay: {
        findFirst: jest.fn().mockResolvedValueOnce(openDay).mockResolvedValueOnce(closedDay),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      businessDayClosing: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(closing()),
      },
      shiftSession: {
        count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(1),
      },
      cashDrawer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([{ id: 'drawer-id', currencyCode: 'INR' }]),
      },
      shiftReconciliation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'reconciliation-id',
            currencyCode: 'INR',
            expectedCashMinor: 12_000,
            countedCashMinor: 12_500,
            varianceMinor: 500,
          },
        ]),
      },
    });
    const service = new BusinessDayService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const response = await service.close(
      businessDayId,
      { version: 1, closingNotes: 'Closed cleanly' },
      {},
      actor,
      {},
    );

    expect(response).toMatchObject({
      id: businessDayId,
      status: BusinessDayStatus.CLOSED,
      version: 2,
      closing: {
        id: closingId,
        expectedCashMinor: 12_000,
        countedCashMinor: 12_500,
        varianceMinor: 500,
      },
    });
    expect(tx.businessDayClosing.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        outletId,
        businessDayId,
        businessDate: new Date('2026-06-15T00:00:00.000Z'),
        shiftSessionCount: 1,
        cashDrawerCount: 1,
        reconciliationCount: 1,
        currencyCode: 'INR',
        expectedCashMinor: 12_000,
        countedCashMinor: 12_500,
        varianceMinor: 500,
        closedByUserId: actorId,
        closingNotes: 'Closed cleanly',
      },
    });
    expect(tx.businessDay.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId,
          id: businessDayId,
          version: 1,
          status: BusinessDayStatus.OPEN,
        },
      }),
    );
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'business_day.closing_recorded',
        targetType: 'BusinessDayClosing',
        targetId: closingId,
      }),
    );
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'business_day.closed',
        targetId: businessDayId,
      }),
    );
  });

  it('rejects close when expected version does not match', async () => {
    const tx = txMock({
      businessDay: {
        findFirst: jest.fn().mockResolvedValue(day()),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      businessDayClosing: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(closing()),
      },
      shiftSession: {
        count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0),
      },
      cashDrawer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      shiftReconciliation: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const service = new BusinessDayService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.close(businessDayId, { version: 1 }, {}, actor, {})).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects business day close when active shift sessions remain', async () => {
    const tx = txMock({
      businessDay: { findFirst: jest.fn().mockResolvedValue(day()), updateMany: jest.fn() },
      businessDayClosing: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      shiftSession: { count: jest.fn().mockResolvedValueOnce(1) },
      cashDrawer: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn() },
      shiftReconciliation: { findMany: jest.fn() },
    });
    const service = new BusinessDayService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.close(businessDayId, { version: 1 }, {}, actor, {})).rejects.toThrow(
      ConflictException,
    );
    expect(tx.businessDay.updateMany).not.toHaveBeenCalled();
    expect(tx.businessDayClosing.create).not.toHaveBeenCalled();
  });

  it('rejects business day close when active cash drawers remain', async () => {
    const tx = txMock({
      businessDay: { findFirst: jest.fn().mockResolvedValue(day()), updateMany: jest.fn() },
      businessDayClosing: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      shiftSession: { count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0) },
      cashDrawer: { count: jest.fn().mockResolvedValueOnce(1), findMany: jest.fn() },
      shiftReconciliation: { findMany: jest.fn() },
    });
    const service = new BusinessDayService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.close(businessDayId, { version: 1 }, {}, actor, {})).rejects.toThrow(
      ConflictException,
    );
    expect(tx.businessDay.updateMany).not.toHaveBeenCalled();
    expect(tx.businessDayClosing.create).not.toHaveBeenCalled();
  });

  it('rejects business day close when shift sessions are unreconciled', async () => {
    const tx = txMock({
      businessDay: { findFirst: jest.fn().mockResolvedValue(day()), updateMany: jest.fn() },
      businessDayClosing: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      shiftSession: { count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1) },
      cashDrawer: { count: jest.fn().mockResolvedValueOnce(0), findMany: jest.fn() },
      shiftReconciliation: { findMany: jest.fn() },
    });
    const service = new BusinessDayService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.close(businessDayId, { version: 1 }, {}, actor, {})).rejects.toThrow(
      ConflictException,
    );
    expect(tx.businessDay.updateMany).not.toHaveBeenCalled();
    expect(tx.businessDayClosing.create).not.toHaveBeenCalled();
  });
});

function day(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: businessDayId,
    tenantId,
    outletId,
    businessDate: new Date('2026-06-15T00:00:00.000Z'),
    status: BusinessDayStatus.OPEN,
    openedAt: new Date('2026-06-15T08:00:00.000Z'),
    closedAt: null,
    openedByUserId: actorId,
    closedByUserId: null,
    openingNotes: null,
    closingNotes: null,
    version: 1,
    createdAt: new Date('2026-06-15T08:00:00.000Z'),
    updatedAt: new Date('2026-06-15T08:00:00.000Z'),
    ...overrides,
  };
}

function closing(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: closingId,
    tenantId,
    outletId,
    businessDayId,
    businessDate: new Date('2026-06-15T00:00:00.000Z'),
    shiftSessionCount: 1,
    cashDrawerCount: 1,
    reconciliationCount: 1,
    currencyCode: 'INR',
    expectedCashMinor: 12_000,
    countedCashMinor: 12_500,
    varianceMinor: 500,
    closedByUserId: actorId,
    closingNotes: 'Closed cleanly',
    closedAt: new Date('2026-06-15T22:00:00.000Z'),
    createdAt: new Date('2026-06-15T22:00:00.000Z'),
    ...overrides,
  };
}

function txMock(overrides: Record<string, unknown>) {
  return {
    $queryRaw: jest.fn(),
    outlet: { findFirst: jest.fn() },
    businessDay: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    businessDayClosing: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    shiftSession: { count: jest.fn() },
    cashDrawer: { count: jest.fn(), findMany: jest.fn() },
    shiftReconciliation: { findMany: jest.fn() },
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
