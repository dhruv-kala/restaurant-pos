import {
  BackgroundJobStatus,
  JobDeadLetterStatus,
  OutboxEventScope,
  type BackgroundJob,
  type BackgroundJobRetryPolicy,
  type JobDeadLetter,
} from '@prisma/client';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { JobRecoveryService } from './job-recovery.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const jobId = '01975c30-0000-7000-8000-000000000300';
const deadLetterId = '01975c30-0000-7000-8000-000000000400';
const userId = '01975c30-0000-7000-8000-000000000500';
const policyId = '01975c30-0000-7000-8000-000000000600';
const now = new Date('2026-06-16T14:00:00.000Z');

const actor: AuthenticatedUser = {
  id: userId,
  email: 'super@example.com',
  name: 'Super Admin',
  tenantId: null,
  outletId: null,
  roles: ['SUPER_ADMIN'],
  permissions: ['*'],
};

function job(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    id: jobId,
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId,
    outboxEventId: null,
    jobType: 'reports.daily',
    aggregateType: 'ScheduledJob',
    aggregateId: '01975c30-0000-7000-8000-000000000700',
    idempotencyKey: 'schedule:test',
    requestFingerprint: 'a'.repeat(64),
    payload: { report: 'sales' },
    redactedPayload: { report: 'sales' },
    status: BackgroundJobStatus.DEAD_LETTERED,
    priority: 100,
    attemptCount: 3,
    maxAttempts: 3,
    availableAt: now,
    lockedBy: null,
    lockedUntil: null,
    lastErrorCode: 'SMTP_TIMEOUT',
    lastErrorMessage: 'Timed out',
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function deadLetter(overrides: Partial<JobDeadLetter> = {}): JobDeadLetter {
  return {
    id: deadLetterId,
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId,
    jobId,
    status: JobDeadLetterStatus.OPEN,
    reasonCode: 'SMTP_TIMEOUT',
    reasonMessage: 'Timed out',
    failedAt: now,
    resolvedAt: null,
    resolvedByUserId: null,
    resolutionNote: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function policy(overrides: Partial<BackgroundJobRetryPolicy> = {}): BackgroundJobRetryPolicy {
  return {
    id: policyId,
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    jobType: 'reports.daily',
    maxAttempts: 4,
    initialDelaySeconds: 30,
    maxDelaySeconds: 300,
    backoffMultiplier: 2,
    createdByUserId: userId,
    updatedByUserId: userId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function serviceWith(transaction: Record<string, unknown>) {
  const prisma = {
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(transaction)),
  };
  const audit = {
    append: jest.fn().mockResolvedValue({}),
  };
  return {
    service: new JobRecoveryService(prisma as never, audit as never),
    audit,
  };
}

interface UpdateJobArg {
  where: { id: string };
  data: {
    status?: BackgroundJobStatus;
    lockedBy?: string | null;
    lockedUntil?: Date | null;
    maxAttempts?: number;
  };
}

interface UpdateDeadLetterArg {
  where: { id: string };
  data: {
    status: JobDeadLetterStatus;
    resolvedByUserId?: string;
    resolutionNote?: string;
  };
}

interface UpdateAttemptArg {
  where: {
    jobId: string;
    attemptNumber: number;
  };
  data: {
    errorCode?: string;
  };
}

describe('JobRecoveryService', () => {
  it('manually retries a dead-lettered job and resolves the open dead letter', async () => {
    const dead = deadLetter();
    const retried = job({
      status: BackgroundJobStatus.PENDING,
      maxAttempts: 4,
    });
    const updateJob = jest.fn<Promise<BackgroundJob>, [UpdateJobArg]>().mockResolvedValue(retried);
    const updateDeadLetter = jest
      .fn<Promise<JobDeadLetter>, [UpdateDeadLetterArg]>()
      .mockResolvedValue(deadLetter({ status: JobDeadLetterStatus.RESOLVED }));
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      backgroundJob: {
        findFirst: jest.fn().mockResolvedValue({ ...job(), deadLetter: dead }),
        update: updateJob,
      },
      jobDeadLetter: {
        update: updateDeadLetter,
      },
    };
    const { service, audit } = serviceWith(tx);

    const result = await service.retryJob(
      jobId,
      { reason: 'Operator verified provider is healthy' },
      { tenantId },
      actor,
      {},
    );

    expect(result.status).toBe(BackgroundJobStatus.PENDING);
    expect(updateJob.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        status: BackgroundJobStatus.PENDING,
        lockedBy: null,
        lockedUntil: null,
        maxAttempts: 4,
      }),
    );
    expect(updateDeadLetter.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        status: JobDeadLetterStatus.RESOLVED,
        resolvedByUserId: userId,
      }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'jobs.retried' }),
    );
  });

  it('cancels a processing job and closes the active attempt', async () => {
    const cancelled = job({ status: BackgroundJobStatus.CANCELLED });
    const updateAttempt = jest
      .fn<Promise<{ count: number }>, [UpdateAttemptArg]>()
      .mockResolvedValue({ count: 1 });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      backgroundJob: {
        findFirst: jest.fn().mockResolvedValue(
          job({
            status: BackgroundJobStatus.PROCESSING,
            attemptCount: 2,
          }),
        ),
        update: jest.fn().mockResolvedValue(cancelled),
      },
      backgroundJobAttempt: {
        updateMany: updateAttempt,
      },
    };
    const { service, audit } = serviceWith(tx);

    const result = await service.cancelJob(
      jobId,
      { reason: 'Bad payload confirmed by operator' },
      { tenantId },
      actor,
      {},
    );

    expect(result.status).toBe(BackgroundJobStatus.CANCELLED);
    expect(updateAttempt.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ jobId, attemptNumber: 2 }),
    );
    expect(updateAttempt.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ errorCode: 'JOB_CANCELLED' }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'jobs.cancelled' }),
    );
  });

  it('resolves a dead-letter record without mutating attempt history', async () => {
    const resolved = deadLetter({
      status: JobDeadLetterStatus.RESOLVED,
      resolvedAt: now,
      resolvedByUserId: userId,
      resolutionNote: 'No retry needed',
    });
    const updateDeadLetter = jest
      .fn<Promise<JobDeadLetter>, [UpdateDeadLetterArg]>()
      .mockResolvedValue(resolved);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      jobDeadLetter: {
        findFirst: jest.fn().mockResolvedValue(deadLetter()),
        update: updateDeadLetter,
      },
    };
    const { service, audit } = serviceWith(tx);

    const result = await service.resolveDeadLetter(
      deadLetterId,
      { resolutionNote: 'No retry needed' },
      { tenantId },
      actor,
      {},
    );

    expect(result.status).toBe(JobDeadLetterStatus.RESOLVED);
    expect(updateDeadLetter.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        status: JobDeadLetterStatus.RESOLVED,
        resolvedByUserId: userId,
        resolutionNote: 'No retry needed',
      }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'jobs.dead_letter.resolved' }),
    );
  });

  it('upserts retry policy configuration by job type', async () => {
    const upsertPolicy = jest.fn().mockResolvedValue(policy());
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      backgroundJobRetryPolicy: {
        upsert: upsertPolicy,
      },
    };
    const { service, audit } = serviceWith(tx);

    const result = await service.upsertRetryPolicy(
      {
        scope: OutboxEventScope.TENANT,
        tenantId,
        jobType: 'reports.daily',
        maxAttempts: 4,
        initialDelaySeconds: 30,
        maxDelaySeconds: 300,
        backoffMultiplier: 2,
      },
      actor,
      {},
    );

    expect(result.jobType).toBe('reports.daily');
    expect(upsertPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scopeKey_jobType: { scopeKey: tenantId, jobType: 'reports.daily' } },
      }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'jobs.retry_policy.upserted' }),
    );
  });
});
