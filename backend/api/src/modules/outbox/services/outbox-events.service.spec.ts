import { ForbiddenException } from '@nestjs/common';
import { OutboxEventScope, OutboxEventStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { OutboxEventsService } from './outbox-events.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const eventId = '01975c30-0000-7000-8000-000000000999';

const manager: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
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

function eventRecord() {
  const now = new Date('2026-06-15T12:00:00.000Z');
  return {
    id: eventId,
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId,
    eventType: 'receipt.created',
    aggregateType: 'Receipt',
    aggregateId: '01975c30-0000-7000-8000-000000000300',
    idempotencyKey: 'receipt:300:created',
    requestFingerprint: 'a'.repeat(64),
    redactedPayload: { receiptId: '01975c30-0000-7000-8000-000000000300' },
    status: OutboxEventStatus.PENDING,
    availableAt: now,
    processedAt: null,
    createdByUserId: manager.id,
    createdAt: now,
    updatedAt: now,
  };
}

interface FindManyArgs {
  where: {
    tenantId?: string;
    outletId?: string;
  };
}

describe('OutboxEventsService', () => {
  it('lists same-tenant events with actor outlet scope', async () => {
    const findMany = jest
      .fn<Promise<ReturnType<typeof eventRecord>[]>, [FindManyArgs]>()
      .mockResolvedValue([eventRecord()]);
    const tx = {
      $queryRaw: jest.fn(),
      outboxEvent: {
        findMany,
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new OutboxEventsService(transactionalPrisma(tx));

    const result = await service.list({ page: 1, limit: 20 }, manager);

    expect(findMany.mock.calls[0][0].where).toEqual({
      tenantId,
      outletId,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: eventId,
        payload: { receiptId: '01975c30-0000-7000-8000-000000000300' },
      }),
    );
  });

  it('rejects cross-tenant query attempts', async () => {
    const service = new OutboxEventsService(transactionalPrisma({}));

    await expect(
      service.list(
        {
          tenantId: '01975c30-0000-7000-8000-000000000999',
          page: 1,
          limit: 20,
        },
        manager,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
