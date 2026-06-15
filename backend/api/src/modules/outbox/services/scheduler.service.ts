import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OutboxEventScope,
  Prisma,
  ScheduledJobStatus,
  type BackgroundJob,
  type ScheduledJob,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  ChangeScheduledJobStatusDto,
  CreateScheduledJobDto,
  ScheduledJobQueryDto,
  ScheduledJobScopeDto,
} from '../dto/scheduler.dto';
import type {
  CreateScheduledJobInput,
  ScanDueSchedulesInput,
  ScheduledJobRunResult,
} from '../models/scheduler.model';
import { BackgroundJobsService } from './background-jobs.service';
import { redactOutboxPayload } from './outbox-payload.util';
import {
  requireSchedulerManage,
  requireSchedulerView,
  resolveSchedulerReadScope,
  resolveSchedulerWriteScope,
} from './scheduler-access.util';
import { calculateNextRunAt, validateScheduleShape } from './scheduler-expression.util';

const defaultScanLimit = 25;
const maxScanLimit = 100;

const scheduledJobDetailInclude = {
  runs: {
    orderBy: { dueAt: 'desc' },
    take: 20,
  },
} satisfies Prisma.ScheduledJobInclude;

type ScheduledJobDetail = Prisma.ScheduledJobGetPayload<{
  include: typeof scheduledJobDetailInclude;
}>;

@Injectable()
export class SchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly backgroundJobs: BackgroundJobsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateScheduledJobDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireSchedulerManage(actor);
    const input = this.normalizeCreate(dto, actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, input.tenantId ?? undefined);
      const record = await this.createRecord(tx, input);
      await this.auditChange(tx, record, actor, request, 'created');
      return this.response(record);
    });
  }

  async list(query: ScheduledJobQueryDto, actor: AuthenticatedUser) {
    requireSchedulerView(actor);
    const scope = resolveSchedulerReadScope(actor, query.tenantId, query.outletId, query.scope);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.ScheduledJobWhereInput = {
        ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
        ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(!scope.platformOnly && scope.outletId ? { outletId: scope.outletId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.scheduleKey ? { scheduleKey: query.scheduleKey.trim() } : {}),
        ...(query.jobType ? { jobType: query.jobType.trim() } : {}),
      };
      const [records, total] = await Promise.all([
        tx.scheduledJob.findMany({
          where,
          orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.scheduledJob.count({ where }),
      ]);
      return {
        data: records.map((record) => this.response(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: ScheduledJobScopeDto, actor: AuthenticatedUser) {
    requireSchedulerView(actor);
    const scope = resolveSchedulerReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const record = await tx.scheduledJob.findFirst({
        where: {
          id,
          ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
          ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(!scope.platformOnly && scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include: scheduledJobDetailInclude,
      });
      if (!record) throw new NotFoundException('Scheduled job not found');
      return this.response(record);
    });
  }

  async pause(
    id: string,
    dto: ChangeScheduledJobStatusDto,
    query: ScheduledJobScopeDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireSchedulerManage(actor);
    return this.changeStatus(id, dto, query, actor, request, ScheduledJobStatus.PAUSED, 'paused');
  }

  async resume(
    id: string,
    dto: ChangeScheduledJobStatusDto,
    query: ScheduledJobScopeDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireSchedulerManage(actor);
    return this.changeStatus(id, dto, query, actor, request, ScheduledJobStatus.ACTIVE, 'resumed');
  }

  async scanDueSchedules(
    transaction: Prisma.TransactionClient,
    input: ScanDueSchedulesInput = {},
  ): Promise<ScheduledJobRunResult[]> {
    const limit = this.boundedLimit(input.limit ?? defaultScanLimit);
    const now = input.now ?? new Date();
    const rows = await transaction.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "scheduled_jobs"
      WHERE "status" = 'ACTIVE' AND "next_run_at" <= ${now}
      ORDER BY "next_run_at" ASC, "created_at" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;
    if (rows.length === 0) return [];
    const schedules = await transaction.scheduledJob.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'asc' }],
    });
    const results: ScheduledJobRunResult[] = [];
    for (const schedule of schedules) {
      results.push(await this.createRunForDueSchedule(transaction, schedule, now));
    }
    return results;
  }

  private normalizeCreate(
    dto: CreateScheduledJobDto,
    actor: AuthenticatedUser,
  ): CreateScheduledJobInput {
    const scope = resolveSchedulerWriteScope(
      actor,
      dto.scope ?? OutboxEventScope.TENANT,
      dto.tenantId,
      dto.outletId,
    );
    validateScheduleShape({
      scheduleType: dto.scheduleType,
      cronExpression: dto.cronExpression,
      intervalSeconds: dto.intervalSeconds,
    });
    return {
      ...scope,
      scheduleKey: this.requiredText(dto.scheduleKey, 'scheduleKey', 120),
      displayName: this.requiredText(dto.displayName, 'displayName', 160),
      description: this.optionalText(dto.description, 500),
      jobType: this.requiredText(dto.jobType, 'jobType', 160),
      payload: dto.payload as Prisma.InputJsonValue,
      scheduleType: dto.scheduleType,
      cronExpression: dto.cronExpression?.trim() || null,
      intervalSeconds: dto.intervalSeconds ?? null,
      timezone: this.optionalText(dto.timezone, 64) ?? 'UTC',
      nextRunAt: dto.nextRunAt ? new Date(dto.nextRunAt) : new Date(),
      createdByUserId: actor.id,
    };
  }

  private async createRecord(
    tx: Prisma.TransactionClient,
    input: CreateScheduledJobInput,
  ): Promise<ScheduledJob> {
    try {
      return await tx.scheduledJob.create({
        data: {
          scope: input.scope,
          scopeKey: input.scope === OutboxEventScope.PLATFORM ? 'platform' : input.tenantId!,
          tenantId: input.tenantId,
          outletId: input.outletId,
          scheduleKey: input.scheduleKey,
          displayName: input.displayName,
          description: input.description,
          jobType: input.jobType,
          payload: input.payload,
          redactedPayload: redactOutboxPayload(input.payload),
          scheduleType: input.scheduleType,
          cronExpression: input.cronExpression,
          intervalSeconds: input.intervalSeconds,
          timezone: input.timezone ?? 'UTC',
          nextRunAt: input.nextRunAt ?? new Date(),
          createdByUserId: input.createdByUserId,
          updatedByUserId: input.createdByUserId,
        },
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException('Scheduled job key already exists in this scope');
      }
      throw error;
    }
  }

  private async changeStatus(
    id: string,
    dto: ChangeScheduledJobStatusDto,
    query: ScheduledJobScopeDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    status: ScheduledJobStatus,
    action: 'paused' | 'resumed',
  ) {
    const scope = resolveSchedulerReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await tx.scheduledJob.findFirst({
        where: {
          id,
          ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
          ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
      });
      if (!existing) throw new NotFoundException('Scheduled job not found');
      const nextRunAt =
        status === ScheduledJobStatus.ACTIVE && existing.nextRunAt <= new Date()
          ? calculateNextRunAt(existing, new Date())
          : undefined;
      const updated = await tx.scheduledJob.updateMany({
        where: { id, version: dto.version },
        data: {
          status,
          nextRunAt,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Scheduled job version is stale');
      }
      const record = await tx.scheduledJob.findUniqueOrThrow({ where: { id } });
      await this.auditChange(tx, record, actor, request, action);
      return this.response(record);
    });
  }

  private async createRunForDueSchedule(
    tx: Prisma.TransactionClient,
    schedule: ScheduledJob,
    now: Date,
  ): Promise<ScheduledJobRunResult> {
    if (schedule.status !== ScheduledJobStatus.ACTIVE) {
      throw new BadRequestException('Only active schedules can be triggered');
    }
    const dueAt = schedule.nextRunAt;
    const idempotencyKey = `schedule:${schedule.id}:${dueAt.toISOString()}`;
    const existing = await tx.scheduledJobRun.findUnique({
      where: {
        scheduledJobId_dueAt: {
          scheduledJobId: schedule.id,
          dueAt,
        },
      },
    });
    if (existing?.backgroundJobId) {
      await this.advanceSchedule(tx, schedule, dueAt);
      return {
        scheduledJobId: schedule.id,
        dueAt,
        backgroundJobId: existing.backgroundJobId,
        idempotencyKey,
        created: false,
      };
    }
    const backgroundJob = await this.backgroundJobs.create(tx, {
      scope: schedule.scope,
      tenantId: schedule.tenantId,
      outletId: schedule.outletId,
      jobType: schedule.jobType,
      aggregateType: 'ScheduledJob',
      aggregateId: schedule.id,
      idempotencyKey,
      payload: schedule.payload as Prisma.InputJsonValue,
      availableAt: now,
      createdByUserId: schedule.createdByUserId,
    });
    const run = await this.createRun(tx, schedule, backgroundJob, dueAt, idempotencyKey);
    await this.advanceSchedule(tx, schedule, dueAt);
    return {
      scheduledJobId: schedule.id,
      dueAt,
      backgroundJobId: run.backgroundJobId!,
      idempotencyKey,
      created: true,
    };
  }

  private async createRun(
    tx: Prisma.TransactionClient,
    schedule: ScheduledJob,
    backgroundJob: BackgroundJob,
    dueAt: Date,
    idempotencyKey: string,
  ) {
    try {
      return await tx.scheduledJobRun.create({
        data: {
          scope: schedule.scope,
          scopeKey: schedule.scopeKey,
          tenantId: schedule.tenantId,
          outletId: schedule.outletId,
          scheduledJobId: schedule.id,
          backgroundJobId: backgroundJob.id,
          dueAt,
          idempotencyKey,
        },
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const existing = await tx.scheduledJobRun.findUnique({
        where: {
          scheduledJobId_dueAt: {
            scheduledJobId: schedule.id,
            dueAt,
          },
        },
      });
      if (!existing) throw error;
      return existing;
    }
  }

  private async advanceSchedule(
    tx: Prisma.TransactionClient,
    schedule: ScheduledJob,
    dueAt: Date,
  ): Promise<void> {
    await tx.scheduledJob.updateMany({
      where: {
        id: schedule.id,
        nextRunAt: dueAt,
      },
      data: {
        lastRunAt: dueAt,
        nextRunAt: calculateNextRunAt(schedule, dueAt),
        version: { increment: 1 },
      },
    });
  }

  private response(record: ScheduledJob | ScheduledJobDetail) {
    return {
      id: record.id,
      scope: record.scope,
      scopeKey: record.scopeKey,
      tenantId: record.tenantId,
      outletId: record.outletId,
      scheduleKey: record.scheduleKey,
      displayName: record.displayName,
      description: record.description,
      jobType: record.jobType,
      redactedPayload: record.redactedPayload,
      status: record.status,
      scheduleType: record.scheduleType,
      cronExpression: record.cronExpression,
      intervalSeconds: record.intervalSeconds,
      timezone: record.timezone,
      nextRunAt: record.nextRunAt,
      lastRunAt: record.lastRunAt,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...('runs' in record
        ? {
            runs: record.runs.map((run) => ({
              id: run.id,
              scheduledJobId: run.scheduledJobId,
              outletId: run.outletId,
              backgroundJobId: run.backgroundJobId,
              dueAt: run.dueAt,
              triggeredAt: run.triggeredAt,
              status: run.status,
              idempotencyKey: run.idempotencyKey,
              failureCode: run.failureCode,
              createdAt: run.createdAt,
            })),
          }
        : {}),
    };
  }

  private async auditChange(
    tx: Prisma.TransactionClient,
    record: ScheduledJob,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: 'created' | 'paused' | 'resumed',
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: record.tenantId,
      outletId: record.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: `scheduler.job.${action}`,
      targetType: 'ScheduledJob',
      targetId: record.id,
      metadata: {
        scheduleKey: record.scheduleKey,
        jobType: record.jobType,
        status: record.status,
        version: record.version,
      },
      ...request,
    });
  }

  private boundedLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }
    return Math.min(limit, maxScanLimit);
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

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
