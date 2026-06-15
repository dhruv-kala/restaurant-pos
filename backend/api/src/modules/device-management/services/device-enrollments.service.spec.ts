import { BadRequestException, ConflictException } from '@nestjs/common';
import { DeviceEnrollmentStatus, DeviceStatus, DeviceType } from '@prisma/client';
import { createHash } from 'node:crypto';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { DeviceEnrollmentsService } from './device-enrollments.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const userId = '01975c30-0000-7000-8000-000000000001';
const deviceId = '01975c30-0000-7000-8000-000000000900';
const enrollmentId = '01975c30-0000-7000-8000-000000000901';

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
  return {
    id: deviceId,
    tenantId,
    outletId,
    deviceIdentifier: 'POS-01',
    deviceType: DeviceType.POS_TERMINAL,
    status: DeviceStatus.PENDING,
    version: 1,
    ...overrides,
  };
}

function enrollment(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-06-15T12:00:00.000Z');
  return {
    id: enrollmentId,
    tenantId,
    outletId,
    deviceId,
    status: DeviceEnrollmentStatus.REQUESTED,
    activationCodeMasked: '******34',
    requestedByUserId: userId,
    approvedByUserId: null,
    activatedByUserId: null,
    requestedAt: now,
    approvedAt: null,
    activatedAt: null,
    expiresAt: new Date('2099-06-15T12:15:00.000Z'),
    cancelledAt: null,
    cancellationReason: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

interface CreateEnrollmentCall {
  data: {
    tenantId: string;
    outletId: string | null;
    deviceId: string;
    activationCodeHash: string;
    activationCodeMasked: string;
    requestedByUserId: string;
    expiresAt: Date;
  };
}

interface UpdateEnrollmentCall {
  where: { tenantId_id: { tenantId: string; id: string } };
  data: Record<string, unknown>;
}

interface UpdateDeviceCall {
  where: { tenantId_id: { tenantId: string; id: string } };
  data: Record<string, unknown>;
}

interface FindActivationEnrollmentCall {
  where: {
    activationCodeHash: string;
    status: DeviceEnrollmentStatus;
  };
}

interface AuditCall {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

function hashActivationCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

describe('DeviceEnrollmentsService', () => {
  it('requests enrollment with a protected activation code and audit event', async () => {
    const created = enrollment();
    const tx = {
      $queryRaw: jest.fn(),
      device: { findFirst: jest.fn().mockResolvedValue(device()) },
      deviceEnrollment: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn<Promise<typeof created>, [CreateEnrollmentCall]>()
          .mockResolvedValue(created),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new DeviceEnrollmentsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.request(deviceId, { expiresInMinutes: 15 }, manager, {});

    const createCall = tx.deviceEnrollment.create.mock.calls[0][0];
    expect(createCall.data).toEqual(
      expect.objectContaining({
        tenantId,
        outletId,
        deviceId,
        requestedByUserId: userId,
      }),
    );
    expect(createCall.data.activationCodeHash).toHaveLength(64);
    expect(createCall.data.activationCodeMasked).toMatch(/^\*{6}[A-F0-9]{2}$/);
    expect(result.activationCode).toMatch(/^[A-F0-9]{8}$/);
    expect(result).toEqual(expect.objectContaining({ id: enrollmentId }));
    expect(append.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        action: 'device.enrollment_requested',
        targetType: 'DeviceEnrollment',
        targetId: enrollmentId,
      }),
    );
  });

  it('rejects a request when an active enrollment already exists', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      device: { findFirst: jest.fn().mockResolvedValue(device()) },
      deviceEnrollment: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ id: enrollmentId }),
      },
    };
    const service = new DeviceEnrollmentsService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.request(deviceId, { expiresInMinutes: 15 }, manager, {})).rejects.toThrow(
      ConflictException,
    );
  });

  it('approves a requested enrollment with optimistic versioning', async () => {
    const approved = enrollment({
      status: DeviceEnrollmentStatus.APPROVED,
      approvedByUserId: userId,
      approvedAt: new Date('2026-06-15T12:01:00.000Z'),
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      deviceEnrollment: {
        findFirst: jest.fn().mockResolvedValue(enrollment()),
        update: jest
          .fn<Promise<typeof approved>, [UpdateEnrollmentCall]>()
          .mockResolvedValue(approved),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new DeviceEnrollmentsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.approve(enrollmentId, { version: 1 }, {}, manager, {});

    const updateCall = tx.deviceEnrollment.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ tenantId_id: { tenantId, id: enrollmentId } });
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        status: DeviceEnrollmentStatus.APPROVED,
        approvedByUserId: userId,
        version: { increment: 1 },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ status: DeviceEnrollmentStatus.APPROVED, version: 2 }),
    );
    expect(append.mock.calls[0][1].action).toBe('device.enrollment_approved');
  });

  it('marks expired requested enrollments instead of approving them', async () => {
    const expired = enrollment({
      status: DeviceEnrollmentStatus.EXPIRED,
      expiresAt: new Date('2026-06-15T00:00:00.000Z'),
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      deviceEnrollment: {
        findFirst: jest
          .fn()
          .mockResolvedValue(enrollment({ expiresAt: new Date('2026-06-15T00:00:00.000Z') })),
        update: jest
          .fn<Promise<typeof expired>, [UpdateEnrollmentCall]>()
          .mockResolvedValue(expired),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new DeviceEnrollmentsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.approve(enrollmentId, { version: 1 }, {}, manager, {});

    expect(result.status).toBe(DeviceEnrollmentStatus.EXPIRED);
    expect(append.mock.calls[0][1].action).toBe('device.enrollment_expired');
  });

  it('activates an approved enrollment and the linked device', async () => {
    const code = 'A1B2C3D4';
    const approved = enrollment({
      status: DeviceEnrollmentStatus.APPROVED,
      approvedByUserId: userId,
      approvedAt: new Date('2026-06-15T12:01:00.000Z'),
      activationCodeMasked: '******D4',
    });
    const activated = enrollment({
      ...approved,
      status: DeviceEnrollmentStatus.ACTIVATED,
      activatedByUserId: userId,
      activatedAt: new Date('2026-06-15T12:02:00.000Z'),
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      device: {
        findUnique: jest.fn().mockResolvedValue(device()),
        update: jest
          .fn<Promise<ReturnType<typeof device>>, [UpdateDeviceCall]>()
          .mockResolvedValue(device({ status: DeviceStatus.ACTIVE, version: 2 })),
      },
      deviceEnrollment: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest
          .fn<Promise<typeof approved>, [FindActivationEnrollmentCall]>()
          .mockResolvedValue(approved),
        update: jest
          .fn<Promise<typeof activated>, [UpdateEnrollmentCall]>()
          .mockResolvedValue(activated),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new DeviceEnrollmentsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.activate(
      { deviceIdentifier: ' POS-01 ', activationCode: code },
      manager,
      {},
    );

    const findCall = tx.deviceEnrollment.findFirst.mock.calls[0][0];
    expect(findCall.where.activationCodeHash).toBe(hashActivationCode(code));
    expect(findCall.where.status).toBe(DeviceEnrollmentStatus.APPROVED);
    expect(tx.deviceEnrollment.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        status: DeviceEnrollmentStatus.ACTIVATED,
        activatedByUserId: userId,
        version: { increment: 1 },
      }),
    );
    expect(tx.device.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        status: DeviceStatus.ACTIVE,
        updatedByUserId: userId,
        version: { increment: 1 },
      }),
    );
    expect(result.status).toBe(DeviceEnrollmentStatus.ACTIVATED);
    expect(append.mock.calls.map((call) => call[1].action)).toEqual([
      'device.enrollment_activated',
      'device.activated',
    ]);
  });

  it('rejects activation with an invalid or expired code', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      device: { findUnique: jest.fn().mockResolvedValue(device()) },
      deviceEnrollment: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new DeviceEnrollmentsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.activate({ deviceIdentifier: 'POS-01', activationCode: 'BADCODE' }, manager, {}),
    ).rejects.toThrow(BadRequestException);
  });
});
