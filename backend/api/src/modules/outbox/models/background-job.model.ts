import type { BackgroundJob, Prisma } from '@prisma/client';

export interface BackgroundJobHandler {
  readonly jobType: string;
  handle(job: BackgroundJob): Promise<void>;
}

export interface CreateBackgroundJobInput {
  outboxEventId?: string | null;
  scope: BackgroundJob['scope'];
  tenantId?: string | null;
  outletId?: string | null;
  jobType: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  idempotencyKey: string;
  payload: Prisma.InputJsonValue;
  priority?: number;
  maxAttempts?: number;
  availableAt?: Date | null;
  createdByUserId?: string | null;
}

export interface ClaimBackgroundJobsInput {
  workerId: string;
  limit?: number;
  leaseSeconds?: number;
  now?: Date;
}

export interface BackgroundJobFailureInput {
  retryable: boolean;
  errorCode: string;
  errorClassification?: string | null;
  errorMessage?: string | null;
  nextAvailableAt?: Date | null;
}
