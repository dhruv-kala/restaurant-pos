import { BadRequestException } from '@nestjs/common';
import {
  CommunicationChannel,
  CommunicationMessageStatus,
  CommunicationProviderStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CommunicationAnalyticsService } from './communication-analytics.service';

const actor: AuthenticatedUser = {
  id: 'user-1',
  email: 'admin@example.com',
  name: 'Admin',
  tenantId: 'tenant-1',
  outletId: null,
  roles: ['TENANT_ADMIN'],
  permissions: [],
};

describe('CommunicationAnalyticsService', () => {
  it('aggregates summary, channel, provider, latency, and trend metrics', async () => {
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          groupKey: 'provider-1',
          averageDeliveryTimeMs: 1250,
        },
      ])
      .mockResolvedValueOnce([
        {
          groupKey: CommunicationChannel.EMAIL,
          averageDeliveryTimeMs: 1250,
        },
      ])
      .mockResolvedValueOnce([
        {
          providerId: 'provider-1',
          averageWebhookLatencyMs: 250,
        },
      ])
      .mockResolvedValueOnce([
        {
          bucket: new Date('2026-06-01T00:00:00.000Z'),
          totalMessages: 4n,
          deliveredMessages: 3n,
          failedMessages: 1n,
        },
      ]);
    const groupBy = jest
      .fn()
      .mockResolvedValueOnce([
        {
          status: CommunicationMessageStatus.DELIVERED,
          _count: { _all: 2 },
        },
        {
          status: CommunicationMessageStatus.READ,
          _count: { _all: 1 },
        },
        {
          status: CommunicationMessageStatus.FAILED,
          _count: { _all: 1 },
        },
      ])
      .mockResolvedValueOnce([
        {
          channel: CommunicationChannel.EMAIL,
          status: CommunicationMessageStatus.DELIVERED,
          _count: { _all: 2 },
        },
        {
          channel: CommunicationChannel.EMAIL,
          status: CommunicationMessageStatus.FAILED,
          _count: { _all: 1 },
        },
      ])
      .mockResolvedValueOnce([
        {
          providerId: 'provider-1',
          status: CommunicationMessageStatus.DELIVERED,
          _count: { _all: 2 },
        },
        {
          providerId: 'provider-1',
          status: CommunicationMessageStatus.FAILED,
          _count: { _all: 1 },
        },
      ]);
    const tx = {
      $queryRaw: queryRaw,
      communicationMessage: { groupBy },
      communicationProvider: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'provider-1',
            channel: CommunicationChannel.EMAIL,
            providerKey: 'smtp',
            displayName: 'SMTP',
            status: CommunicationProviderStatus.ACTIVE,
          },
        ]),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new CommunicationAnalyticsService(prisma);

    const report = await service.report(
      {
        from: new Date('2026-06-01T00:00:00.000Z'),
        to: new Date('2026-06-30T23:59:59.999Z'),
        groupBy: 'DAY',
      },
      actor,
    );

    expect(report.summary).toEqual({
      totalMessages: 4,
      deliveredMessages: 3,
      failedMessages: 1,
      pendingMessages: 0,
      cancelledMessages: 0,
      successRate: 0.75,
      failureRate: 0.25,
    });
    expect(report.channels[0]).toEqual(
      expect.objectContaining({
        channel: CommunicationChannel.EMAIL,
        averageDeliveryTimeMs: 1250,
      }),
    );
    expect(report.providers[0]).toEqual(
      expect.objectContaining({
        id: 'provider-1',
        successRate: 0.6667,
        averageWebhookLatencyMs: 250,
      }),
    );
    expect(report.trends[0]).toEqual(
      expect.objectContaining({
        totalMessages: 4,
        successRate: 0.75,
      }),
    );
  });

  it('rejects inverted and oversized date ranges', async () => {
    const service = new CommunicationAnalyticsService({} as PrismaService);
    await expect(
      service.report(
        {
          from: new Date('2026-06-02T00:00:00.000Z'),
          to: new Date('2026-06-01T00:00:00.000Z'),
          groupBy: 'DAY',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.report(
        {
          from: new Date('2025-01-01T00:00:00.000Z'),
          to: new Date('2026-06-01T00:00:00.000Z'),
          groupBy: 'MONTH',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
