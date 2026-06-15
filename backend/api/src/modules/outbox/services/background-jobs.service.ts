import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  BackgroundJobAttemptStatus,
  BackgroundJobStatus,
  OutboxEventScope,
  OutboxEventStatus,
  Prisma,
  type BackgroundJob,
  type OutboxEvent,
} from '@prisma/client';
import { createHash } from 'node:crypto';

import type {
  BackgroundJobFailureInput,
  BackgroundJobRetryPolicyConfig,
  ClaimBackgroundJobsInput,
  CreateBackgroundJobInput,
} from '../models/background-job.model';
import { redactOutboxPayload, stableStringify } from './outbox-payload.util';

const defaultClaimLimit = 10;
const defaultLeaseSeconds = 300;

@Injectable()
export class BackgroundJobsService {
  async create(
    transaction: Prisma.TransactionClient,
    input: CreateBackgroundJobInput,
  ): Promise<BackgroundJob> {
    const normalized = this.normalizeCreate(input);
    const requestFingerprint = this.fingerprint(normalized);
    const existing = await transaction.backgroundJob.findUnique({
      where: {
        scopeKey_jobType_idempotencyKey: {
          scopeKey: normalized.scopeKey,
          jobType: normalized.jobType,
          idempotencyKey: normalized.idempotencyKey,
        },
      },
    });
    if (existing) {
      this.assertIdempotentMatch(existing.requestFingerprint, requestFingerprint);
      return existing;
    }

    try {
      return await transaction.backgroundJob.create({
        data: {
          outboxEventId: normalized.outboxEventId,
          scope: normalized.scope,
          scopeKey: normalized.scopeKey,
          tenantId: normalized.tenantId,
          outletId: normalized.outletId,
          jobType: normalized.jobType,
          aggregateType: normalized.aggregateType,
          aggregateId: normalized.aggregateId,
          idempotencyKey: normalized.idempotencyKey,
          requestFingerprint,
          payload: normalized.payload,
          redactedPayload: redactOutboxPayload(normalized.payload),
          priority: normalized.priority,
          maxAttempts: normalized.maxAttempts,
          availableAt: normalized.availableAt,
          createdByUserId: normalized.createdByUserId,
        },
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const concurrent = await transaction.backgroundJob.findUnique({
        where: {
          scopeKey_jobType_idempotencyKey: {
            scopeKey: normalized.scopeKey,
            jobType: normalized.jobType,
            idempotencyKey: normalized.idempotencyKey,
          },
        },
      });
      if (concurrent) {
        this.assertIdempotentMatch(concurrent.requestFingerprint, requestFingerprint);
        return concurrent;
      }
      throw error;
    }
  }

  async materializeOutboxEvent(
    transaction: Prisma.TransactionClient,
    outboxEvent: OutboxEvent,
  ): Promise<BackgroundJob> {
    const job = await this.create(transaction, {
      outboxEventId: outboxEvent.id,
      scope: outboxEvent.scope,
      tenantId: outboxEvent.tenantId,
      outletId: outboxEvent.outletId,
      jobType: outboxEvent.eventType,
      aggregateType: outboxEvent.aggregateType,
      aggregateId: outboxEvent.aggregateId,
      idempotencyKey: `outbox:${outboxEvent.id}`,
      payload: outboxEvent.payload as Prisma.InputJsonValue,
      availableAt: outboxEvent.availableAt,
      createdByUserId: outboxEvent.createdByUserId,
    });
    if (outboxEvent.status !== OutboxEventStatus.PROCESSED) {
      await transaction.outboxEvent.update({
        where: { id: outboxEvent.id },
        data: {
          status: OutboxEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    }
    return job;
  }

  async materializePendingOutboxEvents(
    transaction: Prisma.TransactionClient,
    limit = defaultClaimLimit,
    now = new Date(),
  ): Promise<BackgroundJob[]> {
    const boundedLimit = this.boundedLimit(limit);
    const events = await transaction.outboxEvent.findMany({
      where: {
        status: OutboxEventStatus.PENDING,
        availableAt: { lte: now },
      },
      orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
      take: boundedLimit,
    });
    const jobs: BackgroundJob[] = [];
    for (const event of events) {
      jobs.push(await this.materializeOutboxEvent(transaction, event));
    }
    return jobs;
  }

  async claimBatch(
    transaction: Prisma.TransactionClient,
    input: ClaimBackgroundJobsInput,
  ): Promise<BackgroundJob[]> {
    const workerId = this.requiredText(input.workerId, 'workerId', 120);
    const limit = this.boundedLimit(input.limit ?? defaultClaimLimit);
    const now = input.now ?? new Date();
    const leaseSeconds = this.boundedLeaseSeconds(input.leaseSeconds ?? defaultLeaseSeconds);
    const lockedUntil = new Date(now.getTime() + leaseSeconds * 1000);
    const rows = await transaction.$queryRaw<{ id: string }[]>`
      WITH candidates AS (
        SELECT "id"
        FROM "background_jobs"
        WHERE
          (
            "status" IN ('PENDING', 'RETRYING')
            AND "available_at" <= ${now}
          )
          OR
          (
            "status" = 'PROCESSING'
            AND "locked_until" <= ${now}
          )
        ORDER BY "priority" ASC, "available_at" ASC, "created_at" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "background_jobs" AS job
      SET
        "status" = 'PROCESSING',
        "locked_by" = ${workerId},
        "locked_until" = ${lockedUntil},
        "attempt_count" = job."attempt_count" + 1,
        "updated_at" = CURRENT_TIMESTAMP
      FROM candidates
      WHERE
        job."id" = candidates."id"
        AND job."attempt_count" < job."max_attempts"
      RETURNING job."id"
    `;
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const jobs = await transaction.backgroundJob.findMany({
      where: { id: { in: ids } },
      orderBy: [{ priority: 'asc' }, { availableAt: 'asc' }, { createdAt: 'asc' }],
    });
    for (const job of jobs) {
      await transaction.backgroundJobAttempt.create({
        data: {
          scope: job.scope,
          scopeKey: job.scopeKey,
          tenantId: job.tenantId,
          jobId: job.id,
          attemptNumber: job.attemptCount,
          workerId,
        },
      });
    }
    return jobs;
  }

  async markSucceeded(
    transaction: Prisma.TransactionClient,
    jobId: string,
    attemptNumber: number,
  ): Promise<void> {
    await transaction.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: BackgroundJobStatus.SUCCEEDED,
        lockedBy: null,
        lockedUntil: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    await transaction.backgroundJobAttempt.update({
      where: {
        jobId_attemptNumber: {
          jobId,
          attemptNumber,
        },
      },
      data: {
        status: BackgroundJobAttemptStatus.SUCCEEDED,
        completedAt: new Date(),
      },
    });
  }

  async markFailed(
    transaction: Prisma.TransactionClient,
    jobId: string,
    attemptNumber: number,
    failure: BackgroundJobFailureInput,
  ): Promise<void> {
    const errorCode = this.requiredText(failure.errorCode, 'errorCode', 120);
    const errorClassification = this.optionalText(failure.errorClassification, 80);
    const errorMessage = this.sanitizeErrorMessage(this.optionalText(failure.errorMessage, 500));
    const now = failure.now ?? new Date();
    const job = await transaction.backgroundJob.findUniqueOrThrow({ where: { id: jobId } });
    const retryPolicy = await this.resolveRetryPolicy(transaction, job);
    const retryable = failure.retryable && attemptNumber < retryPolicy.maxAttempts;
    const nextAvailableAt = retryable
      ? (failure.nextAvailableAt ?? this.calculateNextAttemptAt(now, attemptNumber, retryPolicy))
      : undefined;
    await transaction.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: retryable ? BackgroundJobStatus.RETRYING : BackgroundJobStatus.DEAD_LETTERED,
        availableAt: nextAvailableAt,
        lockedBy: null,
        lockedUntil: null,
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage,
      },
    });
    await transaction.backgroundJobAttempt.update({
      where: {
        jobId_attemptNumber: {
          jobId,
          attemptNumber,
        },
      },
      data: {
        status: retryable
          ? BackgroundJobAttemptStatus.RETRYABLE_FAILED
          : BackgroundJobAttemptStatus.TERMINAL_FAILED,
        errorCode,
        errorClassification,
        errorMessage,
        completedAt: new Date(),
      },
    });
    if (!retryable) {
      await this.createDeadLetter(transaction, job, errorCode, errorMessage, now);
    }
  }

  private normalizeCreate(input: CreateBackgroundJobInput): NormalizedBackgroundJob {
    const jobType = this.requiredText(input.jobType, 'jobType', 160);
    const idempotencyKey = this.requiredText(input.idempotencyKey, 'idempotencyKey', 180);
    const tenantId = this.optionalText(input.tenantId, 36);
    const outletId = this.optionalText(input.outletId, 36);
    const priority = input.priority ?? 100;
    const maxAttempts = input.maxAttempts ?? 5;
    if (priority < 0) throw new BadRequestException('priority must be zero or greater');
    if (maxAttempts <= 0) throw new BadRequestException('maxAttempts must be greater than zero');
    if (input.scope === OutboxEventScope.PLATFORM) {
      if (tenantId || outletId) {
        throw new BadRequestException(
          'Platform background jobs cannot include tenantId or outletId',
        );
      }
      return {
        scope: input.scope,
        scopeKey: 'platform',
        tenantId: null,
        outletId: null,
        outboxEventId: this.optionalText(input.outboxEventId, 36),
        jobType,
        aggregateType: this.optionalText(input.aggregateType, 100),
        aggregateId: this.optionalText(input.aggregateId, 160),
        idempotencyKey,
        payload: input.payload,
        priority,
        maxAttempts,
        availableAt: input.availableAt ?? undefined,
        createdByUserId: this.optionalText(input.createdByUserId, 36),
      };
    }
    if (input.scope !== OutboxEventScope.TENANT) {
      throw new BadRequestException('Unsupported background job scope');
    }
    if (!tenantId) throw new BadRequestException('tenantId is required for tenant background jobs');
    return {
      scope: input.scope,
      scopeKey: tenantId,
      tenantId,
      outletId,
      outboxEventId: this.optionalText(input.outboxEventId, 36),
      jobType,
      aggregateType: this.optionalText(input.aggregateType, 100),
      aggregateId: this.optionalText(input.aggregateId, 160),
      idempotencyKey,
      payload: input.payload,
      priority,
      maxAttempts,
      availableAt: input.availableAt ?? undefined,
      createdByUserId: this.optionalText(input.createdByUserId, 36),
    };
  }

  private fingerprint(input: NormalizedBackgroundJob): string {
    return createHash('sha256')
      .update(
        stableStringify({
          scope: input.scope,
          scopeKey: input.scopeKey,
          tenantId: input.tenantId,
          outletId: input.outletId,
          outboxEventId: input.outboxEventId,
          jobType: input.jobType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          idempotencyKey: input.idempotencyKey,
          payload: input.payload,
          priority: input.priority,
          maxAttempts: input.maxAttempts,
          availableAt: input.availableAt?.toISOString() ?? null,
          createdByUserId: input.createdByUserId,
        }),
      )
      .digest('hex');
  }

  private assertIdempotentMatch(actual: string, expected: string): void {
    if (actual !== expected) {
      throw new ConflictException(
        'Idempotency key was already used for a different background job',
      );
    }
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private boundedLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }
    return Math.min(limit, 100);
  }

  private boundedLeaseSeconds(seconds: number): number {
    if (!Number.isInteger(seconds) || seconds < 1) {
      throw new BadRequestException('leaseSeconds must be a positive integer');
    }
    return Math.min(seconds, 3600);
  }

  private requiredText(value: string, field: string, maxLength: number): string {
    const trimmed = value.trim();
    if (!trimmed) throw new BadRequestException(`${field} is required`);
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or fewer`);
    }
    return trimmed;
  }

  private optionalText(value: string | null | undefined, maxLength: number): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`Value must be ${maxLength} characters or fewer`);
    }
    return trimmed;
  }

  private sanitizeErrorMessage(value: string | null): string | null {
    if (value === null) return null;
    return value.replace(
      /(authorization|credential|password|secret|token|api.?key|signature|cookie|session)=\S+/gi,
      '$1=[REDACTED]',
    );
  }

  private async resolveRetryPolicy(
    transaction: Prisma.TransactionClient,
    job: BackgroundJob,
  ): Promise<BackgroundJobRetryPolicyConfig> {
    const policy = await transaction.backgroundJobRetryPolicy.findUnique({
      where: {
        scopeKey_jobType: {
          scopeKey: job.scopeKey,
          jobType: job.jobType,
        },
      },
    });
    return {
      maxAttempts: policy?.maxAttempts ?? job.maxAttempts,
      initialDelaySeconds: policy?.initialDelaySeconds ?? 30,
      maxDelaySeconds: policy?.maxDelaySeconds ?? 3600,
      backoffMultiplier: policy?.backoffMultiplier ?? 2,
    };
  }

  private calculateNextAttemptAt(
    now: Date,
    attemptNumber: number,
    policy: BackgroundJobRetryPolicyConfig,
  ): Date {
    const exponent = Math.max(0, attemptNumber - 1);
    const rawDelay = policy.initialDelaySeconds * Math.pow(policy.backoffMultiplier, exponent);
    const boundedDelay = Math.min(rawDelay, policy.maxDelaySeconds);
    return new Date(now.getTime() + boundedDelay * 1000);
  }

  private async createDeadLetter(
    transaction: Prisma.TransactionClient,
    job: BackgroundJob,
    reasonCode: string,
    reasonMessage: string | null,
    failedAt: Date,
  ): Promise<void> {
    try {
      await transaction.jobDeadLetter.create({
        data: {
          scope: job.scope,
          scopeKey: job.scopeKey,
          tenantId: job.tenantId,
          outletId: job.outletId,
          jobId: job.id,
          reasonCode,
          reasonMessage,
          failedAt,
        },
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
    }
  }
}

interface NormalizedBackgroundJob {
  scope: OutboxEventScope;
  scopeKey: string;
  tenantId: string | null;
  outletId: string | null;
  outboxEventId: string | null;
  jobType: string;
  aggregateType: string | null;
  aggregateId: string | null;
  idempotencyKey: string;
  payload: Prisma.InputJsonValue;
  priority: number;
  maxAttempts: number;
  availableAt?: Date;
  createdByUserId: string | null;
}
