import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  DeviceSecurityPolicyStatus,
  DeviceStatus,
  DeviceType,
  TrustedSessionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TrustedSessionsService } from './trusted-sessions.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const userId = '01975c30-0000-7000-8000-000000000001';
const otherUserId = '01975c30-0000-7000-8000-000000000002';
const deviceId = '01975c30-0000-7000-8000-000000000900';
const sessionId = '01975c30-0000-7000-8000-000000000902';

const manager: AuthenticatedUser = {
  id: userId,
  email: 'manager@example.test',
  name: 'Manager',
  tenantId,
  outletId,
  roles: ['MANAGER'],
  permissions: [],
};

const waiter: AuthenticatedUser = {
  id: userId,
  email: 'waiter@example.test',
  name: 'Waiter',
  tenantId,
  outletId,
  roles: ['WAITER'],
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
    status: DeviceStatus.ACTIVE,
    ...overrides,
  };
}

function trustedSession(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-06-15T12:00:00.000Z');
  return {
    id: sessionId,
    tenantId,
    outletId,
    deviceId,
    userId,
    status: TrustedSessionStatus.ACTIVE,
    sessionTokenMasked: '******abcdef',
    trustedAt: now,
    lastRenewedAt: null,
    expiresAt: new Date('2099-06-15T12:00:00.000Z'),
    revokedAt: null,
    revokedByUserId: null,
    revocationReason: null,
    userAgent: null,
    ipAddress: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function securityPolicy(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-06-15T12:00:00.000Z');
  return {
    id: '01975c30-0000-7000-8000-000000000930',
    tenantId,
    outletId,
    name: 'POS Security',
    status: DeviceSecurityPolicyStatus.ACTIVE,
    requireTrustedSession: true,
    sessionTimeoutMinutes: 30,
    forceLogoutBefore: null,
    allowedDeviceTypes: [DeviceType.POS_TERMINAL],
    restrictions: null,
    createdByUserId: userId,
    updatedByUserId: userId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

interface CreateTrustedSessionCall {
  data: {
    tenantId: string;
    outletId: string | null;
    deviceId: string;
    userId: string;
    sessionTokenHash: string;
    sessionTokenMasked: string;
    expiresAt: Date;
  };
}

interface UpdateTrustedSessionCall {
  where: { tenantId_id: { tenantId: string; id: string } };
  data: Record<string, unknown>;
}

interface AuditCall {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

describe('TrustedSessionsService', () => {
  it('creates a trusted session for the current user and active device', async () => {
    const created = trustedSession();
    const tx = {
      $queryRaw: jest.fn(),
      device: { findFirst: jest.fn().mockResolvedValue(device()) },
      deviceSecurityPolicy: { findFirst: jest.fn().mockResolvedValue(null) },
      trustedSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn<Promise<typeof created>, [CreateTrustedSessionCall]>()
          .mockResolvedValue(created),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TrustedSessionsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.create(
      deviceId,
      { expiresInMinutes: 60, userAgent: 'POS App', ipAddress: '127.0.0.1' },
      waiter,
      {},
    );

    const createCall = tx.trustedSession.create.mock.calls[0][0];
    expect(createCall.data).toEqual(
      expect.objectContaining({
        tenantId,
        outletId,
        deviceId,
        userId,
      }),
    );
    expect(createCall.data.sessionTokenHash).toHaveLength(64);
    expect(createCall.data.sessionTokenMasked).toMatch(/^\*{6}.+$/);
    expect(result.sessionToken).toEqual(expect.any(String));
    expect(result.sessionToken).toHaveLength(43);
    expect(tx.deviceSecurityPolicy.findFirst).toHaveBeenCalled();
    expect(append.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        action: 'trusted_session.created',
        targetType: 'TrustedSession',
        targetId: sessionId,
      }),
    );
  });

  it('caps trusted session expiry by the effective security policy', async () => {
    const created = trustedSession();
    const tx = {
      $queryRaw: jest.fn(),
      device: { findFirst: jest.fn().mockResolvedValue(device()) },
      deviceSecurityPolicy: { findFirst: jest.fn().mockResolvedValue(securityPolicy()) },
      trustedSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn<Promise<typeof created>, [CreateTrustedSessionCall]>()
          .mockResolvedValue(created),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TrustedSessionsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const before = Date.now();
    await service.create(deviceId, { expiresInMinutes: 120 }, waiter, {});
    const expiresAt = tx.trustedSession.create.mock.calls[0][0].data.expiresAt.getTime();

    expect(expiresAt).toBeGreaterThanOrEqual(before + 29 * 60_000);
    expect(expiresAt).toBeLessThanOrEqual(before + 31 * 60_000);
  });

  it('rejects trusted session creation when policy blocks the device type', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      device: {
        findFirst: jest.fn().mockResolvedValue(device({ deviceType: DeviceType.KITCHEN_DISPLAY })),
      },
      deviceSecurityPolicy: { findFirst: jest.fn().mockResolvedValue(securityPolicy()) },
    };
    const service = new TrustedSessionsService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.create(deviceId, { expiresInMinutes: 60 }, waiter, {})).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects trusted session creation for inactive devices', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      device: { findFirst: jest.fn().mockResolvedValue(device({ status: DeviceStatus.DISABLED })) },
    };
    const service = new TrustedSessionsService(transactionalPrisma(tx), {} as AuditService);

    await expect(service.create(deviceId, { expiresInMinutes: 60 }, waiter, {})).rejects.toThrow(
      ConflictException,
    );
  });

  it('renews an active owned trusted session', async () => {
    const renewed = trustedSession({
      lastRenewedAt: new Date('2026-06-15T12:05:00.000Z'),
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      device: { findFirst: jest.fn().mockResolvedValue(device()) },
      deviceSecurityPolicy: { findFirst: jest.fn().mockResolvedValue(null) },
      trustedSession: {
        findFirst: jest.fn().mockResolvedValue(trustedSession()),
        update: jest
          .fn<Promise<typeof renewed>, [UpdateTrustedSessionCall]>()
          .mockResolvedValue(renewed),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TrustedSessionsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.renew(
      sessionId,
      { version: 1, expiresInMinutes: 120 },
      {},
      waiter,
      {},
    );

    const updateCall = tx.trustedSession.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ tenantId_id: { tenantId, id: sessionId } });
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        version: { increment: 1 },
      }),
    );
    expect(updateCall.data.expiresAt).toBeInstanceOf(Date);
    expect(result).toEqual(expect.objectContaining({ version: 2 }));
    expect(append.mock.calls[0][1].action).toBe('trusted_session.renewed');
  });

  it('marks an expired active session during renewal', async () => {
    const expired = trustedSession({
      status: TrustedSessionStatus.EXPIRED,
      expiresAt: new Date('2026-06-15T00:00:00.000Z'),
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      trustedSession: {
        findFirst: jest.fn().mockResolvedValue(
          trustedSession({
            expiresAt: new Date('2026-06-15T00:00:00.000Z'),
          }),
        ),
        update: jest
          .fn<Promise<typeof expired>, [UpdateTrustedSessionCall]>()
          .mockResolvedValue(expired),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TrustedSessionsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.renew(
      sessionId,
      { version: 1, expiresInMinutes: 60 },
      {},
      waiter,
      {},
    );

    expect(result.status).toBe(TrustedSessionStatus.EXPIRED);
    expect(append.mock.calls[0][1].action).toBe('trusted_session.expired');
  });

  it('revokes an owned trusted session with audit metadata', async () => {
    const revoked = trustedSession({
      status: TrustedSessionStatus.REVOKED,
      revokedByUserId: userId,
      revokedAt: new Date('2026-06-15T12:10:00.000Z'),
      revocationReason: 'Lost tablet',
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      trustedSession: {
        findFirst: jest.fn().mockResolvedValue(trustedSession()),
        update: jest
          .fn<Promise<typeof revoked>, [UpdateTrustedSessionCall]>()
          .mockResolvedValue(revoked),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TrustedSessionsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.revoke(
      sessionId,
      { version: 1, reason: 'Lost tablet' },
      {},
      waiter,
      {},
    );

    const updateCall = tx.trustedSession.update.mock.calls[0][0];
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        status: TrustedSessionStatus.REVOKED,
        revokedByUserId: userId,
        revocationReason: 'Lost tablet',
        version: { increment: 1 },
      }),
    );
    expect(result.status).toBe(TrustedSessionStatus.REVOKED);
    expect(append.mock.calls[0][1].action).toBe('trusted_session.revoked');
  });

  it('prevents non-managers from renewing another user session', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      trustedSession: {
        findFirst: jest.fn().mockResolvedValue(trustedSession({ userId: otherUserId })),
      },
    };
    const service = new TrustedSessionsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.renew(sessionId, { version: 1, expiresInMinutes: 60 }, {}, waiter, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows managers to revoke outlet sessions owned by another user', async () => {
    const revoked = trustedSession({
      userId: otherUserId,
      status: TrustedSessionStatus.REVOKED,
      revokedByUserId: userId,
      revokedAt: new Date('2026-06-15T12:10:00.000Z'),
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      trustedSession: {
        findFirst: jest.fn().mockResolvedValue(trustedSession({ userId: otherUserId })),
        update: jest
          .fn<Promise<typeof revoked>, [UpdateTrustedSessionCall]>()
          .mockResolvedValue(revoked),
      },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new TrustedSessionsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.revoke(sessionId, { version: 1 }, {}, manager, {});

    expect(result.status).toBe(TrustedSessionStatus.REVOKED);
    expect(append.mock.calls[0][1].action).toBe('trusted_session.revoked');
  });
});
