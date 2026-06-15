import { ConflictException } from '@nestjs/common';
import {
  DeviceSecurityPolicyStatus,
  DeviceStatus,
  DeviceType,
  TrustedSessionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { DeviceSecurityPoliciesService } from './device-security-policies.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const userId = '01975c30-0000-7000-8000-000000000001';
const policyId = '01975c30-0000-7000-8000-000000000930';
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

function policy(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-06-15T12:00:00.000Z');
  return {
    id: policyId,
    tenantId,
    outletId,
    name: 'POS Security',
    status: DeviceSecurityPolicyStatus.ACTIVE,
    requireTrustedSession: true,
    sessionTimeoutMinutes: 60,
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

interface CreatePolicyCall {
  data: {
    tenantId: string;
    outletId: string | null;
    name: string;
    requireTrustedSession: boolean;
    sessionTimeoutMinutes: number;
    allowedDeviceTypes: DeviceType[];
    createdByUserId: string;
    updatedByUserId: string;
  };
}

interface UpdatePolicyCall {
  where: { tenantId_id: { tenantId: string; id: string } };
  data: Record<string, unknown>;
}

interface AuditCall {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

describe('DeviceSecurityPoliciesService', () => {
  it('creates an active outlet policy and audits it', async () => {
    const created = policy();
    const tx = {
      $queryRaw: jest.fn(),
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: outletId }) },
      deviceSecurityPolicy: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn<Promise<typeof created>, [CreatePolicyCall]>().mockResolvedValue(created),
      },
      trustedSession: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new DeviceSecurityPoliciesService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.create(
      {
        outletId,
        name: ' POS Security ',
        requireTrustedSession: true,
        sessionTimeoutMinutes: 60,
        allowedDeviceTypes: [DeviceType.POS_TERMINAL],
      },
      manager,
      {},
    );

    const createCall = tx.deviceSecurityPolicy.create.mock.calls[0][0];
    expect(createCall.data).toEqual(
      expect.objectContaining({
        tenantId,
        outletId,
        name: 'POS Security',
        requireTrustedSession: true,
        sessionTimeoutMinutes: 60,
        allowedDeviceTypes: [DeviceType.POS_TERMINAL],
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: policyId, revokedSessions: 0 }));
    expect(append.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        action: 'device_security_policy.created',
        targetType: 'DeviceSecurityPolicy',
        targetId: policyId,
      }),
    );
  });

  it('rejects a duplicate active policy for the same scope', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: outletId }) },
      deviceSecurityPolicy: { findFirst: jest.fn().mockResolvedValue({ id: policyId }) },
    };
    const service = new DeviceSecurityPoliciesService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.create(
        {
          outletId,
          name: 'POS Security',
          requireTrustedSession: true,
          sessionTimeoutMinutes: 60,
          allowedDeviceTypes: [DeviceType.POS_TERMINAL],
        },
        manager,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates a policy and applies forced logout', async () => {
    const forceLogoutBefore = new Date('2026-06-15T12:05:00.000Z');
    const updated = policy({
      forceLogoutBefore,
      sessionTimeoutMinutes: 30,
      version: 2,
    });
    const tx = {
      $queryRaw: jest.fn(),
      deviceSecurityPolicy: {
        findFirst: jest.fn().mockResolvedValue(policy()),
        update: jest.fn<Promise<typeof updated>, [UpdatePolicyCall]>().mockResolvedValue(updated),
      },
      trustedSession: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
    };
    const append = jest.fn<Promise<unknown>, [object, AuditCall]>().mockResolvedValue(undefined);
    const service = new DeviceSecurityPoliciesService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.update(
      policyId,
      {
        version: 1,
        sessionTimeoutMinutes: 30,
        forceLogoutBefore: forceLogoutBefore.toISOString(),
      },
      {},
      manager,
      {},
    );

    const updateCall = tx.deviceSecurityPolicy.update.mock.calls[0][0];
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        sessionTimeoutMinutes: 30,
        forceLogoutBefore,
        version: { increment: 1 },
      }),
    );
    const updateManyMock = tx.trustedSession.updateMany as jest.MockedFunction<
      (args: {
        where: { status: TrustedSessionStatus; trustedAt: { lt: Date } };
      }) => Promise<{ count: number }>
    >;
    const updateManyCall = updateManyMock.mock.calls[0][0];
    expect(updateManyCall.where.status).toBe(TrustedSessionStatus.ACTIVE);
    expect(updateManyCall.where.trustedAt).toEqual({ lt: forceLogoutBefore });
    expect(result.revokedSessions).toBe(3);
    expect(append.mock.calls[0][1].metadata).toEqual(
      expect.objectContaining({ revokedSessions: 3 }),
    );
  });

  it('evaluates outlet policy before tenant fallback', async () => {
    const outletPolicy = policy({ outletId, sessionTimeoutMinutes: 45 });
    const tx = {
      $queryRaw: jest.fn(),
      device: { findFirst: jest.fn().mockResolvedValue(device()) },
      deviceSecurityPolicy: { findFirst: jest.fn().mockResolvedValue(outletPolicy) },
    };
    const service = new DeviceSecurityPoliciesService(transactionalPrisma(tx), {} as AuditService);

    const result = await service.evaluate(deviceId, {}, manager);

    const findPolicyMock = tx.deviceSecurityPolicy.findFirst as jest.MockedFunction<
      (args: { where: { OR: Array<{ outletId: string | null }> } }) => Promise<unknown>
    >;
    const findPolicyCall = findPolicyMock.mock.calls[0][0];
    expect(findPolicyCall.where.OR).toEqual([{ outletId }, { outletId: null }]);
    expect(result).toEqual(
      expect.objectContaining({
        policyId,
        policyScope: 'OUTLET',
        sessionTimeoutMinutes: 45,
        allowedDeviceType: true,
      }),
    );
  });

  it('reports blocked device types during evaluation', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      device: {
        findFirst: jest.fn().mockResolvedValue(device({ deviceType: DeviceType.KITCHEN_DISPLAY })),
      },
      deviceSecurityPolicy: { findFirst: jest.fn().mockResolvedValue(policy()) },
    };
    const service = new DeviceSecurityPoliciesService(transactionalPrisma(tx), {} as AuditService);

    const result = await service.evaluate(deviceId, {}, manager);

    expect(result.allowedDeviceType).toBe(false);
  });
});
