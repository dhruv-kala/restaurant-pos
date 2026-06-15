import { ConflictException } from '@nestjs/common';
import {
  BackgroundJobAttemptStatus,
  BackgroundJobStatus,
  OutboxEventScope,
  OutboxEventStatus,
  type BackgroundJob,
  type OutboxEvent,
  type Prisma,
} from '@prisma/client';

import type { CreateBackgroundJobInput } from '../models/background-job.model';
import { BackgroundJobsService } from './background-jobs.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const outboxEventId = '01975c30-0000-7000-8000-000000000300';
const jobId = '01975c30-0000-7000-8000-000000000400';
const now = new Date('2026-06-15T12:00:00.000Z');

function createInput(): CreateBackgroundJobInput {
  return {
    outboxEventId,
    scope: OutboxEventScope.TENANT,
    tenantId,
    outletId,
    jobType: 'receipt.created',
    aggregateType: 'Receipt',
    aggregateId: '01975c30-0000-7000-8000-000000000500',
    idempotencyKey: `outbox:${outboxEventId}`,
    payload: { receiptId: '01975c30-0000-7000-8000-000000000500', apiToken: 'secret' },
  };
}

function job(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    id: jobId,
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId,
    outboxEventId,
    jobType: 'receipt.created',
    aggregateType: 'Receipt',
    aggregateId: '01975c30-0000-7000-8000-000000000500',
    idempotencyKey: `outbox:${outboxEventId}`,
    requestFingerprint: 'a'.repeat(64),
    payload: { receiptId: '01975c30-0000-7000-8000-000000000500' },
    redactedPayload: { receiptId: '01975c30-0000-7000-8000-000000000500' },
    status: BackgroundJobStatus.PENDING,
    priority: 100,
    attemptCount: 0,
    maxAttempts: 5,
    availableAt: now,
    lockedBy: null,
    lockedUntil: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdByUserId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function outboxEvent(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
  return {
    id: outboxEventId,
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId,
    eventType: 'receipt.created',
    aggregateType: 'Receipt',
    aggregateId: '01975c30-0000-7000-8000-000000000500',
    idempotencyKey: 'receipt:created',
    requestFingerprint: 'b'.repeat(64),
    payload: { receiptId: '01975c30-0000-7000-8000-000000000500' },
    redactedPayload: { receiptId: '01975c30-0000-7000-8000-000000000500' },
    status: OutboxEventStatus.PENDING,
    availableAt: now,
    processedAt: null,
    createdByUserId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

interface CreateJobArg {
  data: Partial<BackgroundJob>;
}

interface UpdateOutboxArg {
  where: { id: string };
  data: {
    status: OutboxEventStatus;
    processedAt?: Date;
  };
}

interface CreateAttemptArg {
  data: {
    jobId: string;
    attemptNumber: number;
    workerId: string;
  };
}

interface UpdateJobArg {
  where: { id: string };
  data: {
    status: BackgroundJobStatus;
    lastErrorCode?: string | null;
  };
}

interface UpdateAttemptArg {
  where: { jobId_attemptNumber: { jobId: string; attemptNumber: number } };
  data: {
    status: BackgroundJobAttemptStatus;
    errorCode?: string | null;
    errorClassification?: string | null;
    errorMessage?: string | null;
  };
}

describe('BackgroundJobsService', () => {
  it('creates an idempotent background job and redacts payload', async () => {
    const service = new BackgroundJobsService();
    let stored: BackgroundJob | null = null;
    let createData: Partial<BackgroundJob> | undefined;
    const tx = {
      backgroundJob: {
        findUnique: jest.fn(() => Promise.resolve(stored)),
        create: jest.fn<Promise<BackgroundJob>, [CreateJobArg]>(({ data }) => {
          createData = data;
          stored = job({
            ...data,
            availableAt: data.availableAt ?? now,
          });
          return Promise.resolve(stored);
        }),
      },
    };

    const first = await service.create(tx as unknown as Prisma.TransactionClient, createInput());
    const second = await service.create(tx as unknown as Prisma.TransactionClient, createInput());

    expect(second.id).toBe(first.id);
    expect(createData).toEqual(
      expect.objectContaining({
        scopeKey: tenantId,
        redactedPayload: {
          receiptId: '01975c30-0000-7000-8000-000000000500',
          apiToken: '[REDACTED]',
        },
      }),
    );
    expect(tx.backgroundJob.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an idempotency key reused with different content', async () => {
    const service = new BackgroundJobsService();
    const tx = {
      backgroundJob: {
        findUnique: jest.fn(() => Promise.resolve({ requestFingerprint: 'c'.repeat(64) })),
      },
    };

    await expect(
      service.create(tx as unknown as Prisma.TransactionClient, createInput()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('materializes a pending outbox event into a job and marks the event processed', async () => {
    const service = new BackgroundJobsService();
    const event = outboxEvent();
    const updateOutbox = jest
      .fn<Promise<OutboxEvent>, [UpdateOutboxArg]>()
      .mockResolvedValue({ ...event, status: OutboxEventStatus.PROCESSED });
    const tx = {
      backgroundJob: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn<Promise<BackgroundJob>, [CreateJobArg]>(({ data }) =>
          Promise.resolve(job(data)),
        ),
      },
      outboxEvent: {
        update: updateOutbox,
      },
    };

    const result = await service.materializeOutboxEvent(
      tx as unknown as Prisma.TransactionClient,
      event,
    );

    expect(result.outboxEventId).toBe(outboxEventId);
    expect(updateOutbox.mock.calls[0][0].where).toEqual({ id: outboxEventId });
    expect(updateOutbox.mock.calls[0][0].data.status).toBe(OutboxEventStatus.PROCESSED);
  });

  it('claims jobs atomically and creates append-only attempts', async () => {
    const service = new BackgroundJobsService();
    const claimed = job({
      status: BackgroundJobStatus.PROCESSING,
      attemptCount: 1,
      lockedBy: 'worker-1',
      lockedUntil: new Date('2026-06-15T12:05:00.000Z'),
    });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: jobId }]),
      backgroundJob: {
        findMany: jest.fn().mockResolvedValue([claimed]),
      },
      backgroundJobAttempt: {
        create: jest.fn<Promise<unknown>, [CreateAttemptArg]>().mockResolvedValue({}),
      },
    };

    const result = await service.claimBatch(tx as unknown as Prisma.TransactionClient, {
      workerId: 'worker-1',
      limit: 5,
      leaseSeconds: 300,
      now,
    });

    expect(result).toEqual([claimed]);
    const createAttemptCall = tx.backgroundJobAttempt.create.mock.calls[0][0];
    expect(createAttemptCall.data.jobId).toBe(jobId);
    expect(createAttemptCall.data.attemptNumber).toBe(1);
    expect(createAttemptCall.data.workerId).toBe('worker-1');
  });

  it('records retryable failures without leaking raw error objects', async () => {
    const service = new BackgroundJobsService();
    const updateJob = jest.fn<Promise<unknown>, [UpdateJobArg]>().mockResolvedValue({});
    const updateAttempt = jest.fn<Promise<unknown>, [UpdateAttemptArg]>().mockResolvedValue({});
    const tx = {
      backgroundJob: {
        update: updateJob,
      },
      backgroundJobAttempt: {
        update: updateAttempt,
      },
    };

    await service.markFailed(tx as unknown as Prisma.TransactionClient, jobId, 1, {
      retryable: true,
      errorCode: 'SMTP_TIMEOUT',
      errorClassification: 'NETWORK',
      errorMessage: 'Timed out while contacting provider with token=secret',
      nextAvailableAt: new Date('2026-06-15T12:10:00.000Z'),
    });

    expect(updateJob.mock.calls[0][0].where).toEqual({ id: jobId });
    expect(updateJob.mock.calls[0][0].data.status).toBe(BackgroundJobStatus.RETRYING);
    expect(updateJob.mock.calls[0][0].data.lastErrorCode).toBe('SMTP_TIMEOUT');
    expect(updateAttempt.mock.calls[0][0].where).toEqual({
      jobId_attemptNumber: { jobId, attemptNumber: 1 },
    });
    expect(updateAttempt.mock.calls[0][0].data.status).toBe(
      BackgroundJobAttemptStatus.RETRYABLE_FAILED,
    );
    expect(updateAttempt.mock.calls[0][0].data.errorCode).toBe('SMTP_TIMEOUT');
    expect(updateAttempt.mock.calls[0][0].data.errorClassification).toBe('NETWORK');
    expect(updateAttempt.mock.calls[0][0].data.errorMessage).toBe(
      'Timed out while contacting provider with token=[REDACTED]',
    );
  });
});
