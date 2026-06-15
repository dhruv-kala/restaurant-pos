import type { Prisma, ScheduledJob, ScheduledJobScheduleType } from '@prisma/client';

export interface CreateScheduledJobInput {
  scope: ScheduledJob['scope'];
  tenantId?: string | null;
  outletId?: string | null;
  scheduleKey: string;
  displayName: string;
  description?: string | null;
  jobType: string;
  payload: Prisma.InputJsonValue;
  scheduleType: ScheduledJobScheduleType;
  cronExpression?: string | null;
  intervalSeconds?: number | null;
  timezone?: string | null;
  nextRunAt?: Date | null;
  createdByUserId?: string | null;
}

export interface ScanDueSchedulesInput {
  limit?: number;
  now?: Date;
}

export interface ScheduledJobRunResult {
  scheduledJobId: string;
  dueAt: Date;
  backgroundJobId: string;
  idempotencyKey: string;
  created: boolean;
}
