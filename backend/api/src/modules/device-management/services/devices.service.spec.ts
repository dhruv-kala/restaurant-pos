import { BadRequestException, ConflictException } from '@nestjs/common';
import { DeviceStatus, DeviceType } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { DevicesService } from './devices.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const userId = '01975c30-0000-7000-8000-000000000001';
const deviceId = '01975c30-0000-7000-8000-000000000900';

const manager: AuthenticatedUser = {
  id: userId,
  email: 'manager@example.test',
  name: 'Manager',
  tenantId,
  outletId,
  roles: ['MANAGER'],
  permissions: [],
};

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

function device(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-06-15T12:00:00.000Z');
  return {
    id: deviceId,
    tenantId,
    outletId,
    deviceIdentifier: 'POS-01',
    name: 'Main POS',
    deviceType: DeviceType.POS_TERMINAL,
    status: DeviceStatus.PENDING,
    platform: 'windows',
    manufacturer: null,
    model: null,
    osVersion: null,
    appVersion: null,
    serialNumber: null,
    metadata: null,
    registeredByUserId: userId,
    updatedByUserId: userId,
    registeredAt: now,
    lastSeenAt: null,
    statusChangedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

interface CreateDeviceCall {
  data: {
    tenantId: string;
    outletId: string | null;
    deviceIdentifier: string;
    name: string;
    status: DeviceStatus;
  };
}

interface UpdateDeviceCall {
  where: { tenantId_id: { tenantId: string; id: string } };
  data: {
    status: DeviceStatus;
    updatedByUserId: string;
    version: { increment: number };
  };
}

interface AuditCall {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

describe('DevicesService', () => {
  it('registers a pending outlet device and writes an audit event', async () => {
    const created = device();
    const tx = {
      $queryRaw: jest.fn(),
      tenant: { findFirst: jest.fn().mockResolvedValue({ id: tenantId }) },
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: outletId }) },
      device: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn<Promise<typeof created>, [CreateDeviceCall]>().mockResolvedValue(created),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new DevicesService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.register(
      {
        outletId,
        deviceIdentifier: ' POS-01 ',
        name: ' Main POS ',
        deviceType: DeviceType.POS_TERMINAL,
        platform: 'windows',
      },
      manager,
      {},
    );

    const createCall = tx.device.create.mock.calls[0][0];
    expect(createCall.data).toEqual(
      expect.objectContaining({
        tenantId,
        outletId,
        deviceIdentifier: 'POS-01',
        name: 'Main POS',
        status: DeviceStatus.PENDING,
      }),
    );
    const auditCall = append.mock.calls[0][1];
    expect(auditCall).toEqual(
      expect.objectContaining({
        action: 'device.registered',
        targetType: 'Device',
        targetId: deviceId,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: deviceId, status: DeviceStatus.PENDING }));
  });

  it('rejects operational devices without outlet scope', async () => {
    const service = new DevicesService(transactionalPrisma({}), {} as AuditService);

    await expect(
      service.register(
        {
          deviceIdentifier: 'WAITER-01',
          name: 'Waiter Tablet',
          deviceType: DeviceType.WAITER_DEVICE,
        },
        { ...manager, roles: ['TENANT_ADMIN'], outletId: null },
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate tenant device identifiers', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      tenant: { findFirst: jest.fn().mockResolvedValue({ id: tenantId }) },
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: outletId }) },
      device: {
        findUnique: jest.fn().mockResolvedValue({ id: deviceId }),
      },
    };
    const service = new DevicesService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.register(
        {
          outletId,
          deviceIdentifier: 'POS-01',
          name: 'Main POS',
          deviceType: DeviceType.POS_TERMINAL,
        },
        manager,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates device status with optimistic version and audit metadata', async () => {
    const existing = device();
    const updated = device({
      status: DeviceStatus.ACTIVE,
      statusChangedAt: new Date('2026-06-15T12:05:00.000Z'),
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      device: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn<Promise<typeof updated>, [UpdateDeviceCall]>().mockResolvedValue(updated),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new DevicesService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.updateStatus(
      deviceId,
      { status: DeviceStatus.ACTIVE, version: 1 },
      {},
      manager,
      {},
    );

    const updateCall = tx.device.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ tenantId_id: { tenantId, id: deviceId } });
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        status: DeviceStatus.ACTIVE,
        updatedByUserId: userId,
        version: { increment: 1 },
      }),
    );
    const auditCall = append.mock.calls[0][1];
    expect(auditCall.action).toBe('device.status_changed');
    expect(auditCall.metadata).toEqual(
      expect.objectContaining({
        previousStatus: DeviceStatus.PENDING,
        newStatus: DeviceStatus.ACTIVE,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ status: DeviceStatus.ACTIVE, version: 2 }));
  });
});
