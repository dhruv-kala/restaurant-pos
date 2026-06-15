import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  BackgroundJobStatus,
  OutboxEventScope,
  ScheduledJobScheduleType,
  ScheduledJobRunStatus,
  ScheduledJobStatus,
  type BackgroundJob,
  type Prisma,
  type ScheduledJob,
  type ScheduledJobRun,
} from '@prisma/client';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { SchedulerService } from './scheduler.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const otherTenantId = '01975c30-0000-7000-8000-000000000101';
const outletId = '01975c30-0000-7000-8000-000000000200';
const scheduleId = '01975c30-0000-7000-8000-000000000300';
const backgroundJobId = '01975c30-0000-7000-8000-000000000400';
const userId = '01975c30-0000-7000-8000-000000000500';
const now = new Date('2026-06-16T12:00:00.000Z');
const dueAt = new Date('2026-06-16T11:55:00.000Z');

const tenantAdmin: AuthenticatedUser = {
  id: userId,
  email: 'admin@example.com',
  name: 'Tenant Admin',
  tenantId,
  outletId: null,
  roles: ['TENANT_ADMIN'],
  permissions: [],
};

function schedule(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: scheduleId,
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId,
    scheduleKey: 'daily-report',
    displayName: 'Daily report',
    description: null,
    jobType: 'reports.daily',
    payload: { report: 'sales', apiToken: 'secret' },
    redactedPayload: { report: 'sales', apiToken: '[REDACTED]' },
    status: ScheduledJobStatus.ACTIVE,
    scheduleType: ScheduledJobScheduleType.INTERVAL,
    cronExpression: null,
    intervalSeconds: 300,
    timezone: 'UTC',
    nextRunAt: dueAt,
    lastRunAt: null,
    createdByUserId: userId,
    updatedByUserId: userId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function backgroundJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    id: backgroundJobId,
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId,
    outboxEventId: null,
    jobType: 'reports.daily',
    aggregateType: 'ScheduledJob',
    aggregateId: scheduleId,
    idempotencyKey: `schedule:${scheduleId}:${dueAt.toISOString()}`,
    requestFingerprint: 'a'.repeat(64),
    payload: { report: 'sales' },
    redactedPayload: { report: 'sales' },
    status: BackgroundJobStatus.PENDING,
    priority: 100,
    attemptCount: 0,
    maxAttempts: 5,
    availableAt: now,
    lockedBy: null,
    lockedUntil: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function run(overrides: Partial<ScheduledJobRun> = {}): ScheduledJobRun {
  return {
    id: '01975c30-0000-7000-8000-000000000600',
    scope: OutboxEventScope.TENANT,
    scopeKey: tenantId,
    tenantId,
    outletId,
    scheduledJobId: scheduleId,
    backgroundJobId,
    dueAt,
    triggeredAt: now,
    status: ScheduledJobRunStatus.CREATED,
    idempotencyKey: `schedule:${scheduleId}:${dueAt.toISOString()}`,
    failureCode: null,
    failureMessage: null,
    createdAt: now,
    ...overrides,
  };
}

function serviceWith(transaction: Record<string, unknown>) {
  const prisma = {
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(transaction)),
  };
  const backgroundJobs = {
    create: jest.fn().mockResolvedValue(backgroundJob()),
  };
  const audit = {
    append: jest.fn().mockResolvedValue({}),
  };
  return {
    service: new SchedulerService(prisma as never, backgroundJobs as never, audit as never),
    prisma,
    backgroundJobs,
    audit,
  };
}

interface ScheduledJobCreateArg {
  data: {
    scopeKey: string;
    tenantId: string | null;
    outletId: string | null;
    redactedPayload: unknown;
  };
}

describe('SchedulerService', () => {
  it('creates a tenant outlet override schedule with redacted payload', async () => {
    const created = schedule();
    const createScheduledJob = jest
      .fn<Promise<ScheduledJob>, [ScheduledJobCreateArg]>()
      .mockResolvedValue(created);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      scheduledJob: {
        create: createScheduledJob,
      },
    };
    const { service, audit } = serviceWith(tx);

    const result = await service.create(
      {
        scope: OutboxEventScope.TENANT,
        tenantId,
        outletId,
        scheduleKey: 'daily-report',
        displayName: 'Daily report',
        jobType: 'reports.daily',
        payload: { report: 'sales', apiToken: 'secret' },
        scheduleType: ScheduledJobScheduleType.INTERVAL,
        intervalSeconds: 300,
      },
      tenantAdmin,
      {},
    );

    expect(result.outletId).toBe(outletId);
    expect(createScheduledJob).toHaveBeenCalledTimes(1);
    expect(createScheduledJob.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        scopeKey: tenantId,
        tenantId,
        outletId,
        redactedPayload: { report: 'sales', apiToken: '[REDACTED]' },
      }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'scheduler.job.created' }),
    );
  });

  it('rejects cross-tenant schedule management', async () => {
    const tx = { $queryRaw: jest.fn(), scheduledJob: { create: jest.fn() } };
    const { service } = serviceWith(tx);

    await expect(
      service.create(
        {
          scope: OutboxEventScope.TENANT,
          tenantId: otherTenantId,
          scheduleKey: 'daily-report',
          displayName: 'Daily report',
          jobType: 'reports.daily',
          payload: {},
          scheduleType: ScheduledJobScheduleType.INTERVAL,
          intervalSeconds: 300,
        },
        tenantAdmin,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unsupported cron expressions in the foundation parser', async () => {
    const tx = { $queryRaw: jest.fn(), scheduledJob: { create: jest.fn() } };
    const { service } = serviceWith(tx);

    await expect(
      service.create(
        {
          scope: OutboxEventScope.TENANT,
          tenantId,
          scheduleKey: 'monthly-report',
          displayName: 'Monthly report',
          jobType: 'reports.monthly',
          payload: {},
          scheduleType: ScheduledJobScheduleType.CRON,
          cronExpression: '0 8 1 * *',
        },
        tenantAdmin,
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('materializes due active schedules into one background job and run', async () => {
    const dueSchedule = schedule();
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: scheduleId }]),
      scheduledJob: {
        findMany: jest.fn().mockResolvedValue([dueSchedule]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      scheduledJobRun: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(run()),
      },
    };
    const { service, backgroundJobs } = serviceWith(tx);

    const result = await service.scanDueSchedules(tx as unknown as Prisma.TransactionClient, {
      now,
      limit: 10,
    });

    expect(result).toEqual([
      expect.objectContaining({
        scheduledJobId: scheduleId,
        backgroundJobId,
        created: true,
      }),
    ]);
    expect(backgroundJobs.create).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        idempotencyKey: `schedule:${scheduleId}:${dueAt.toISOString()}`,
        aggregateType: 'ScheduledJob',
        aggregateId: scheduleId,
      }),
    );
    expect(tx.scheduledJobRun.create).toHaveBeenCalledTimes(1);
    expect(tx.scheduledJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: scheduleId,
          nextRunAt: dueAt,
        },
      }),
    );
  });

  it('does not create a duplicate run for an already materialized due window', async () => {
    const dueSchedule = schedule();
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: scheduleId }]),
      scheduledJob: {
        findMany: jest.fn().mockResolvedValue([dueSchedule]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      scheduledJobRun: {
        findUnique: jest.fn().mockResolvedValue(run()),
        create: jest.fn(),
      },
    };
    const { service, backgroundJobs } = serviceWith(tx);

    const result = await service.scanDueSchedules(tx as unknown as Prisma.TransactionClient, {
      now,
    });

    expect(result[0]).toEqual(expect.objectContaining({ created: false, backgroundJobId }));
    expect(backgroundJobs.create).not.toHaveBeenCalled();
    expect(tx.scheduledJobRun.create).not.toHaveBeenCalled();
    expect(tx.scheduledJob.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does not trigger paused schedules returned by the due query', async () => {
    const paused = schedule({ status: ScheduledJobStatus.PAUSED });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      scheduledJob: {
        findMany: jest.fn().mockResolvedValue([paused]),
      },
      scheduledJobRun: {
        create: jest.fn(),
      },
    };
    const { service, backgroundJobs } = serviceWith(tx);

    const result = await service.scanDueSchedules(tx as unknown as Prisma.TransactionClient, {
      now,
    });

    expect(result).toEqual([]);
    expect(backgroundJobs.create).not.toHaveBeenCalled();
  });
});
