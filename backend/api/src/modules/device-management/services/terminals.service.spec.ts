import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  DeviceAssignmentStatus,
  DeviceStatus,
  DeviceType,
  OutletStatus,
  TerminalStatus,
  TerminalType,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TerminalsService } from './terminals.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const userId = '01975c30-0000-7000-8000-000000000001';
const terminalId = '01975c30-0000-7000-8000-000000000910';
const deviceId = '01975c30-0000-7000-8000-000000000900';
const assignmentId = '01975c30-0000-7000-8000-000000000920';

const manager: AuthenticatedUser = {
  id: userId,
  email: 'manager@example.test',
  name: 'Manager',
  tenantId,
  outletId,
  roles: ['MANAGER'],
  permissions: [],
};

const tenantAdmin: AuthenticatedUser = {
  id: userId,
  email: 'admin@example.test',
  name: 'Tenant Admin',
  tenantId,
  outletId: null,
  roles: ['TENANT_ADMIN'],
  permissions: [],
};

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

function terminal(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-06-15T12:00:00.000Z');
  return {
    id: terminalId,
    tenantId,
    outletId,
    terminalCode: 'POS-COUNTER-1',
    name: 'POS Counter 1',
    terminalType: TerminalType.POS_COUNTER,
    status: TerminalStatus.ACTIVE,
    description: null,
    createdByUserId: userId,
    updatedByUserId: userId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function device(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: deviceId,
    tenantId,
    outletId,
    deviceIdentifier: 'POS-01',
    deviceType: DeviceType.POS_TERMINAL,
    status: DeviceStatus.ACTIVE,
    ...overrides,
  };
}

function assignment(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-06-15T12:00:00.000Z');
  return {
    id: assignmentId,
    tenantId,
    outletId,
    terminalId,
    deviceId,
    status: DeviceAssignmentStatus.ACTIVE,
    assignedByUserId: userId,
    endedByUserId: null,
    assignedAt: now,
    endedAt: null,
    endReason: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

interface CreateTerminalCall {
  data: {
    tenantId: string;
    outletId: string;
    terminalCode: string;
    name: string;
    terminalType: TerminalType;
    createdByUserId: string;
    updatedByUserId: string;
  };
}

interface CreateAssignmentCall {
  data: {
    tenantId: string;
    outletId: string;
    terminalId: string;
    deviceId: string;
    assignedByUserId: string;
  };
}

interface UpdateAssignmentCall {
  where: { tenantId_id: { tenantId: string; id: string } };
  data: Record<string, unknown>;
}

interface FindOutletCall {
  where: { status: { not: OutletStatus } };
}

interface AuditCall {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

describe('TerminalsService', () => {
  it('creates an outlet terminal and writes an audit event', async () => {
    const created = terminal();
    const tx = {
      $queryRaw: jest.fn(),
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: outletId }) },
      terminal: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn<Promise<typeof created>, [CreateTerminalCall]>().mockResolvedValue(created),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TerminalsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.create(
      {
        outletId,
        terminalCode: ' POS-COUNTER-1 ',
        name: ' POS Counter 1 ',
        terminalType: TerminalType.POS_COUNTER,
      },
      manager,
      {},
    );

    const createCall = tx.terminal.create.mock.calls[0][0];
    expect(createCall.data).toEqual(
      expect.objectContaining({
        tenantId,
        outletId,
        terminalCode: 'POS-COUNTER-1',
        name: 'POS Counter 1',
        terminalType: TerminalType.POS_COUNTER,
        createdByUserId: userId,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: terminalId }));
    expect(append.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        action: 'terminal.created',
        targetType: 'Terminal',
        targetId: terminalId,
      }),
    );
  });

  it('rejects duplicate active terminal codes for an outlet', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: outletId }) },
      terminal: { findFirst: jest.fn().mockResolvedValue({ id: terminalId }) },
    };
    const service = new TerminalsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.create(
        {
          outletId,
          terminalCode: 'POS-COUNTER-1',
          name: 'POS Counter 1',
          terminalType: TerminalType.POS_COUNTER,
        },
        manager,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('assigns an active device to an active terminal', async () => {
    const created = assignment();
    const tx = {
      $queryRaw: jest.fn(),
      terminal: { findFirst: jest.fn().mockResolvedValue(terminal()) },
      device: { findFirst: jest.fn().mockResolvedValue(device()) },
      deviceAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn<Promise<typeof created>, [CreateAssignmentCall]>()
          .mockResolvedValue(created),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TerminalsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.assignDevice(
      terminalId,
      { deviceId, terminalVersion: 1 },
      {},
      manager,
      {},
    );

    const createCall = tx.deviceAssignment.create.mock.calls[0][0];
    expect(createCall.data).toEqual(
      expect.objectContaining({
        tenantId,
        outletId,
        terminalId,
        deviceId,
        assignedByUserId: userId,
      }),
    );
    expect(result.status).toBe(DeviceAssignmentStatus.ACTIVE);
    expect(append.mock.calls[0][1].action).toBe('terminal.device_assigned');
  });

  it('rejects terminal assignment when device and terminal outlets differ', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      terminal: { findFirst: jest.fn().mockResolvedValue(terminal()) },
      device: {
        findFirst: jest
          .fn()
          .mockResolvedValue(device({ outletId: '01975c30-0000-7000-8000-000000000201' })),
      },
    };
    const service = new TerminalsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.assignDevice(terminalId, { deviceId, terminalVersion: 1 }, {}, tenantAdmin, {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects assignment when an active assignment already exists', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      terminal: { findFirst: jest.fn().mockResolvedValue(terminal()) },
      device: { findFirst: jest.fn().mockResolvedValue(device()) },
      deviceAssignment: { findFirst: jest.fn().mockResolvedValue({ id: assignmentId }) },
    };
    const service = new TerminalsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.assignDevice(terminalId, { deviceId, terminalVersion: 1 }, {}, manager, {}),
    ).rejects.toThrow(ConflictException);
  });

  it('ends an active device assignment', async () => {
    const ended = assignment({
      status: DeviceAssignmentStatus.ENDED,
      endedByUserId: userId,
      endedAt: new Date('2026-06-15T12:05:00.000Z'),
      endReason: 'Device replacement',
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      deviceAssignment: {
        findFirst: jest.fn().mockResolvedValue(assignment()),
        update: jest.fn<Promise<typeof ended>, [UpdateAssignmentCall]>().mockResolvedValue(ended),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TerminalsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.endAssignment(
      assignmentId,
      { version: 1, reason: 'Device replacement' },
      {},
      manager,
      {},
    );

    const updateCall = tx.deviceAssignment.update.mock.calls[0][0];
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        status: DeviceAssignmentStatus.ENDED,
        endedByUserId: userId,
        endReason: 'Device replacement',
        version: { increment: 1 },
      }),
    );
    expect(result.status).toBe(DeviceAssignmentStatus.ENDED);
    expect(append.mock.calls[0][1].action).toBe('terminal.device_assignment_ended');
  });

  it('rejects terminal creation for closed outlets', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      outlet: { findFirst: jest.fn<Promise<null>, [FindOutletCall]>().mockResolvedValue(null) },
      terminal: { findFirst: jest.fn() },
    };
    const service = new TerminalsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.create(
        {
          outletId,
          terminalCode: 'POS-COUNTER-1',
          name: 'POS Counter 1',
          terminalType: TerminalType.POS_COUNTER,
        },
        manager,
        {},
      ),
    ).rejects.toThrow('Outlet not found');
    const outletCall = tx.outlet.findFirst.mock.calls[0][0];
    expect(outletCall.where.status).toEqual({ not: OutletStatus.CLOSED });
  });
});
