import {
  CommunicationPushApplication,
  CommunicationPushDeviceStatus,
  CommunicationPushPlatform,
  type Prisma,
} from '@prisma/client';
import type { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../../config/environment.validation';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditService } from '../../audit/services/audit.service';
import { CommunicationAddressProtector } from './communication-address-protector';
import { PushDevicesService } from './push-devices.service';

const actor: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@example.test',
  name: 'User',
  tenantId: 'tenant-1',
  outletId: 'outlet-1',
  roles: ['WAITER'],
};

function setup() {
  const create = jest.fn((input: { data: Record<string, unknown> }) =>
    Promise.resolve({
      id: 'device-1',
      ...input.data,
      status: CommunicationPushDeviceStatus.ACTIVE,
      deactivatedAt: null,
      invalidatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
  const updateMany = jest
    .fn<
      Promise<{ count: number }>,
      [{ where?: Record<string, unknown>; data: Record<string, unknown> }]
    >()
    .mockResolvedValue({ count: 0 });
  const transaction = {
    $queryRaw: jest.fn(),
    communicationPushDevice: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create,
      update: jest.fn(),
      updateMany,
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(transaction as unknown as Prisma.TransactionClient),
    ),
  } as unknown as PrismaService;
  const append = jest.fn().mockResolvedValue({});
  const audit = { append } as unknown as AuditService;
  const config = {
    get: jest.fn(() => Buffer.alloc(32, 7).toString('base64')),
  } as unknown as ConfigService<EnvironmentVariables, true>;
  const addresses = new CommunicationAddressProtector(config);
  return {
    service: new PushDevicesService(prisma, audit, addresses),
    transaction,
    create,
    updateMany,
    append,
  };
}

describe('PushDevicesService', () => {
  it('registers an encrypted tenant-scoped device without returning its token', async () => {
    const { service, create, append } = setup();
    const token = 'fcm-device-token-abcdefghijklmnopqrstuvwxyz';

    const result = await service.register(
      {
        application: CommunicationPushApplication.RESTAURANT_APP,
        platform: CommunicationPushPlatform.ANDROID,
        deviceId: 'installation-1',
        token,
      },
      actor,
      {},
    );
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      userId: 'user-1',
      application: CommunicationPushApplication.RESTAURANT_APP,
      platform: CommunicationPushPlatform.ANDROID,
      deviceId: 'installation-1',
    });
    expect(data.tokenCiphertext).not.toContain(token);
    expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result).not.toHaveProperty('tokenCiphertext');
    expect(result).not.toHaveProperty('tokenHash');
    expect(append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'communication.push_device.registered' }),
    );
  });

  it('invalidates the active token and appends an audit event', async () => {
    const { service, transaction, updateMany, append } = setup();
    transaction.communicationPushDevice.findMany.mockResolvedValue([
      { id: 'device-1', outletId: 'outlet-1' },
    ]);

    await expect(
      service.deactivateInvalidToken(transaction as unknown as Prisma.TransactionClient, {
        tenantId: 'tenant-1',
        tokenHash: 'a'.repeat(64),
        reason: 'FCM_TOKEN_UNREGISTERED',
        actor,
        request: {},
      }),
    ).resolves.toBe(1);
    const invalidation = updateMany.mock.calls.at(-1)?.[0] as {
      data: { status: CommunicationPushDeviceStatus; invalidReason: string };
    };
    expect(invalidation.data).toMatchObject({
      status: CommunicationPushDeviceStatus.INVALID,
      invalidReason: 'FCM_TOKEN_UNREGISTERED',
    });
    expect(append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'communication.push_device.invalidated' }),
    );
  });
});
