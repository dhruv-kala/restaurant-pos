import { BadRequestException, ConflictException } from '@nestjs/common';
import { OutboxEventScope, OutboxEventStatus, type OutboxEvent, type Prisma } from '@prisma/client';

import type { EnqueueOutboxEvent } from '../models/outbox-event.model';
import { OutboxService } from './outbox.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const userId = '01975c30-0000-7000-8000-000000000001';

const input: EnqueueOutboxEvent = {
  scope: OutboxEventScope.TENANT,
  tenantId,
  outletId,
  eventType: 'receipt.created',
  aggregateType: 'Receipt',
  aggregateId: '01975c30-0000-7000-8000-000000000300',
  idempotencyKey: 'receipt:300:created',
  payload: {
    receiptId: '01975c30-0000-7000-8000-000000000300',
    secretToken: 'must-redact',
  },
  createdByUserId: userId,
};

describe('OutboxService', () => {
  it('redacts payload and returns the same event for an identical request', async () => {
    const service = new OutboxService();
    let stored: OutboxEvent | null = null;
    let createData: Record<string, unknown> | undefined;
    const transaction = {
      outboxEvent: {
        findUnique: jest.fn(() => Promise.resolve(stored)),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          stored = {
            id: '01975c30-0000-7000-8000-000000000999',
            ...data,
            status: OutboxEventStatus.PENDING,
            processedAt: null,
            createdAt: new Date('2026-06-15T12:00:00.000Z'),
            updatedAt: new Date('2026-06-15T12:00:00.000Z'),
          } as OutboxEvent;
          return Promise.resolve(stored);
        }),
      },
    };

    const first = await service.enqueue(transaction as unknown as Prisma.TransactionClient, input);
    const second = await service.enqueue(transaction as unknown as Prisma.TransactionClient, input);

    expect(second.id).toBe(first.id);
    expect(createData).toEqual(
      expect.objectContaining({
        scopeKey: tenantId,
        redactedPayload: {
          receiptId: '01975c30-0000-7000-8000-000000000300',
          secretToken: '[REDACTED]',
        },
      }),
    );
    expect(transaction.outboxEvent.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an idempotency key reused with different content', async () => {
    const service = new OutboxService();
    const transaction = {
      outboxEvent: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            requestFingerprint: 'b'.repeat(64),
          }),
        ),
      },
    };

    await expect(
      service.enqueue(transaction as unknown as Prisma.TransactionClient, input),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires tenant scope for tenant events and forbids tenant scope on platform events', async () => {
    const service = new OutboxService();
    await expect(
      service.enqueue({} as Prisma.TransactionClient, {
        ...input,
        tenantId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.enqueue({} as Prisma.TransactionClient, {
        ...input,
        scope: OutboxEventScope.PLATFORM,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
