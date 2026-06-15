import { ConflictException } from '@nestjs/common';
import { BusinessDayStatus, EmployeeStatus, ShiftSessionStatus } from '@prisma/client';

import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuditService } from '../../audit/services/audit.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { ShiftSessionsService } from './shift-sessions.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const actorId = '01975c30-0000-7000-8000-000000000001';
const sessionId = '01975c30-0000-7000-8000-000000000400';
const businessDayId = '01975c30-0000-7000-8000-000000000300';
const shiftId = '01975c30-0000-7000-8000-000000000500';
const employeeId = '01975c30-0000-7000-8000-000000000600';

const actor: AuthenticatedUser = {
  id: actorId,
  email: 'cashier@example.test',
  name: 'Cashier',
  tenantId,
  outletId,
  roles: ['CASHIER'],
  permissions: ['shifts.read', 'shifts.open', 'shifts.close'],
};

describe('ShiftSessionsService', () => {
  it('opens a shift session for the current business day and audits it', async () => {
    const append = jest.fn().mockResolvedValue({});
    const tx = txMock({
      businessDay: { findFirst: jest.fn().mockResolvedValue(businessDay()) },
      employeeProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: employeeId, status: EmployeeStatus.ACTIVE }),
      },
      employeeShiftAssignment: { findFirst: jest.fn().mockResolvedValue({ shiftId }) },
      shift: { findFirst: jest.fn().mockResolvedValue({ id: shiftId }) },
      shiftSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(session()),
      },
    });
    const service = new ShiftSessionsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const response = await service.open({ outletId, openingNotes: 'Cashier start' }, actor, {});

    expect(response).toMatchObject({
      id: sessionId,
      tenantId,
      outletId,
      businessDayId,
      assignedUserId: actorId,
      shiftId,
      status: ShiftSessionStatus.OPEN,
    });
    expect(tx.shiftSession.create).toHaveBeenCalledWith({
      data: {
        tenantId,
        outletId,
        businessDayId,
        assignedUserId: actorId,
        shiftId,
        openedByUserId: actorId,
        openingNotes: 'Cashier start',
      },
    });
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'shift_session.opened',
        targetType: 'ShiftSession',
        targetId: sessionId,
      }),
    );
  });

  it('rejects opening when the user already has an active shift session', async () => {
    const tx = txMock({
      businessDay: { findFirst: jest.fn().mockResolvedValue(businessDay()) },
      employeeProfile: { findFirst: jest.fn().mockResolvedValue({ id: employeeId }) },
      employeeShiftAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
      shiftSession: {
        findFirst: jest.fn().mockResolvedValue({ id: sessionId }),
        create: jest.fn(),
      },
    });
    const service = new ShiftSessionsService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.open({ outletId }, actor, {})).rejects.toThrow(ConflictException);
    expect(tx.shiftSession.create).not.toHaveBeenCalled();
  });

  it('returns the current open shift session for the actor by default', async () => {
    const tx = txMock({
      shiftSession: { findFirst: jest.fn().mockResolvedValue(session()) },
    });
    const service = new ShiftSessionsService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.current({}, actor)).resolves.toMatchObject({
      id: sessionId,
      status: ShiftSessionStatus.OPEN,
    });
    expect(tx.shiftSession.findFirst).toHaveBeenCalledWith({
      where: { tenantId, assignedUserId: actorId, status: ShiftSessionStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
  });

  it('closes an open shift session with optimistic concurrency and audit', async () => {
    const append = jest.fn().mockResolvedValue({});
    const openSession = session();
    const closedSession = session({
      status: ShiftSessionStatus.CLOSED,
      closedAt: new Date('2026-06-15T18:00:00.000Z'),
      closedByUserId: actorId,
      version: 2,
    });
    const tx = txMock({
      shiftSession: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(openSession)
          .mockResolvedValueOnce(closedSession),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const service = new ShiftSessionsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const response = await service.close(
      sessionId,
      { version: 1, closingNotes: 'Done' },
      {},
      actor,
      {},
    );

    expect(response).toMatchObject({
      id: sessionId,
      status: ShiftSessionStatus.CLOSED,
      version: 2,
    });
    expect(tx.shiftSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId,
          id: sessionId,
          version: 1,
          status: ShiftSessionStatus.OPEN,
        },
      }),
    );
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'shift_session.closed',
        targetId: sessionId,
      }),
    );
  });

  it('rejects close when expected version does not match', async () => {
    const tx = txMock({
      shiftSession: {
        findFirst: jest.fn().mockResolvedValue(session()),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });
    const service = new ShiftSessionsService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.close(sessionId, { version: 1 }, {}, actor, {})).rejects.toThrow(
      ConflictException,
    );
  });
});

function businessDay() {
  return {
    id: businessDayId,
    tenantId,
    outletId,
    businessDate: new Date('2026-06-15T00:00:00.000Z'),
    status: BusinessDayStatus.OPEN,
    openedAt: new Date('2026-06-15T08:00:00.000Z'),
  };
}

function session(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: sessionId,
    tenantId,
    outletId,
    businessDayId,
    assignedUserId: actorId,
    shiftId,
    status: ShiftSessionStatus.OPEN,
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

function txMock(overrides: Record<string, unknown>) {
  return {
    $queryRaw: jest.fn(),
    businessDay: { findFirst: jest.fn() },
    employeeProfile: { findFirst: jest.fn() },
    employeeShiftAssignment: { findFirst: jest.fn() },
    shift: { findFirst: jest.fn() },
    shiftSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
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
