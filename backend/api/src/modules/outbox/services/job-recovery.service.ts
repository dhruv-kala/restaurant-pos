import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BackgroundJobAttemptStatus,
  BackgroundJobStatus,
  JobDeadLetterStatus,
  OutboxEventScope,
  Prisma,
  type BackgroundJob,
  type BackgroundJobRetryPolicy,
  type JobDeadLetter,
} from '@prisma/client';

import {
  applyDatabaseRequestContext,
  hasRole,
  PLATFORM_ADMIN_ROLE,
  requireTenantId,
} from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CancelJobDto,
  DeadLetterQueryDto,
  JobQueryDto,
  JobScopeDto,
  ManualRetryJobDto,
  ResolveDeadLetterDto,
  RetryPolicyQueryDto,
  UpsertRetryPolicyDto,
} from '../dto/jobs.dto';
import {
  requireDeadLetterManage,
  requireJobManage,
  requireJobRetry,
  requireOutboxView,
  resolveOutboxReadScope,
} from './outbox-access.util';

const retryableManualStatuses = new Set<BackgroundJobStatus>([
  BackgroundJobStatus.FAILED,
  BackgroundJobStatus.DEAD_LETTERED,
]);

@Injectable()
export class JobRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listJobs(query: JobQueryDto, actor: AuthenticatedUser) {
    requireOutboxView(actor);
    const scope = resolveOutboxReadScope(actor, query.tenantId, query.outletId, query.scope);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.BackgroundJobWhereInput = {
        ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
        ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(!scope.platformOnly && scope.outletId ? { outletId: scope.outletId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.jobType ? { jobType: query.jobType.trim() } : {}),
      };
      const [records, total] = await Promise.all([
        tx.backgroundJob.findMany({
          where,
          orderBy: [{ availableAt: 'desc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.backgroundJob.count({ where }),
      ]);
      return {
        data: records.map((record) => this.jobResponse(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detailJob(id: string, query: JobScopeDto, actor: AuthenticatedUser) {
    requireOutboxView(actor);
    const scope = resolveOutboxReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const record = await tx.backgroundJob.findFirst({
        where: this.jobIdentityWhere(id, scope),
        include: {
          attempts: { orderBy: { attemptNumber: 'asc' } },
          deadLetter: true,
        },
      });
      if (!record) throw new NotFoundException('Background job not found');
      return {
        ...this.jobResponse(record),
        attempts: record.attempts.map((attempt) => ({
          id: attempt.id,
          attemptNumber: attempt.attemptNumber,
          workerId: attempt.workerId,
          status: attempt.status,
          errorCode: attempt.errorCode,
          errorClassification: attempt.errorClassification,
          errorMessage: attempt.errorMessage,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
        })),
        deadLetter: record.deadLetter ? this.deadLetterResponse(record.deadLetter) : null,
      };
    });
  }

  async attempts(id: string, query: JobScopeDto, actor: AuthenticatedUser) {
    const detail = await this.detailJob(id, query, actor);
    return { data: detail.attempts };
  }

  async retryJob(
    id: string,
    dto: ManualRetryJobDto,
    query: JobScopeDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireJobRetry(actor);
    const scope = resolveOutboxReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const job = await tx.backgroundJob.findFirst({
        where: this.jobIdentityWhere(id, scope),
        include: { deadLetter: true },
      });
      if (!job) throw new NotFoundException('Background job not found');
      if (!retryableManualStatuses.has(job.status)) {
        throw new ConflictException('Only failed or dead-lettered jobs can be manually retried');
      }
      const maxAttempts = Math.max(job.maxAttempts, job.attemptCount + 1);
      const updated = await tx.backgroundJob.update({
        where: { id },
        data: {
          status: BackgroundJobStatus.PENDING,
          availableAt: new Date(),
          lockedBy: null,
          lockedUntil: null,
          maxAttempts,
        },
      });
      if (job.deadLetter?.status === JobDeadLetterStatus.OPEN) {
        await tx.jobDeadLetter.update({
          where: { id: job.deadLetter.id },
          data: {
            status: JobDeadLetterStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedByUserId: actor.id,
            resolutionNote: this.optionalText(dto.reason, 500) ?? 'Manual retry requested',
          },
        });
      }
      await this.auditJobAction(tx, updated, actor, request, 'retried', {
        reason: dto.reason ?? null,
        maxAttempts,
      });
      return this.jobResponse(updated);
    });
  }

  async cancelJob(
    id: string,
    dto: CancelJobDto,
    query: JobScopeDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireJobManage(actor);
    const reason = this.requiredText(dto.reason, 'reason', 500);
    const scope = resolveOutboxReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const job = await tx.backgroundJob.findFirst({ where: this.jobIdentityWhere(id, scope) });
      if (!job) throw new NotFoundException('Background job not found');
      if (
        job.status === BackgroundJobStatus.SUCCEEDED ||
        job.status === BackgroundJobStatus.CANCELLED ||
        job.status === BackgroundJobStatus.DEAD_LETTERED
      ) {
        throw new ConflictException('Job cannot be cancelled from its current state');
      }
      const updated = await tx.backgroundJob.update({
        where: { id },
        data: {
          status: BackgroundJobStatus.CANCELLED,
          lockedBy: null,
          lockedUntil: null,
          lastErrorCode: 'JOB_CANCELLED',
          lastErrorMessage: reason,
        },
      });
      if (job.status === BackgroundJobStatus.PROCESSING && job.attemptCount > 0) {
        await tx.backgroundJobAttempt.updateMany({
          where: {
            jobId: job.id,
            attemptNumber: job.attemptCount,
            status: BackgroundJobAttemptStatus.STARTED,
          },
          data: {
            status: BackgroundJobAttemptStatus.TERMINAL_FAILED,
            errorCode: 'JOB_CANCELLED',
            errorClassification: 'OPERATOR',
            errorMessage: reason,
            completedAt: new Date(),
          },
        });
      }
      await this.auditJobAction(tx, updated, actor, request, 'cancelled', { reason });
      return this.jobResponse(updated);
    });
  }

  async listRetryPolicies(query: RetryPolicyQueryDto, actor: AuthenticatedUser) {
    requireOutboxView(actor);
    const scope = resolveOutboxReadScope(actor, query.tenantId, undefined, query.scope);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const records = await tx.backgroundJobRetryPolicy.findMany({
        where: {
          ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
          ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
          ...(query.jobType ? { jobType: query.jobType.trim() } : {}),
        },
        orderBy: [{ scopeKey: 'asc' }, { jobType: 'asc' }],
      });
      return { data: records.map((record) => this.retryPolicyResponse(record)) };
    });
  }

  async upsertRetryPolicy(
    dto: UpsertRetryPolicyDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireJobManage(actor);
    if (dto.maxDelaySeconds < dto.initialDelaySeconds) {
      throw new BadRequestException(
        'maxDelaySeconds must be greater than or equal to initialDelaySeconds',
      );
    }
    const scope = this.resolvePolicyWriteScope(actor, dto.scope, dto.tenantId);
    const jobType = this.requiredText(dto.jobType, 'jobType', 160);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId ?? undefined);
      const record = await tx.backgroundJobRetryPolicy.upsert({
        where: {
          scopeKey_jobType: {
            scopeKey: scope.scopeKey,
            jobType,
          },
        },
        create: {
          scope: scope.scope,
          scopeKey: scope.scopeKey,
          tenantId: scope.tenantId,
          jobType,
          maxAttempts: dto.maxAttempts,
          initialDelaySeconds: dto.initialDelaySeconds,
          maxDelaySeconds: dto.maxDelaySeconds,
          backoffMultiplier: dto.backoffMultiplier,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        update: {
          maxAttempts: dto.maxAttempts,
          initialDelaySeconds: dto.initialDelaySeconds,
          maxDelaySeconds: dto.maxDelaySeconds,
          backoffMultiplier: dto.backoffMultiplier,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      await this.auditPolicyChange(tx, record, actor, request);
      return this.retryPolicyResponse(record);
    });
  }

  async listDeadLetters(query: DeadLetterQueryDto, actor: AuthenticatedUser) {
    requireOutboxView(actor);
    const scope = resolveOutboxReadScope(actor, query.tenantId, query.outletId, query.scope);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.JobDeadLetterWhereInput = {
        ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
        ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(!scope.platformOnly && scope.outletId ? { outletId: scope.outletId } : {}),
        ...(query.status ? { status: query.status } : {}),
      };
      const [records, total] = await Promise.all([
        tx.jobDeadLetter.findMany({
          where,
          orderBy: [{ failedAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.jobDeadLetter.count({ where }),
      ]);
      return {
        data: records.map((record) => this.deadLetterResponse(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async resolveDeadLetter(
    id: string,
    dto: ResolveDeadLetterDto,
    query: JobScopeDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDeadLetterManage(actor);
    const resolutionNote = this.requiredText(dto.resolutionNote, 'resolutionNote', 500);
    const scope = resolveOutboxReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const deadLetter = await tx.jobDeadLetter.findFirst({
        where: {
          id,
          ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
          ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
      });
      if (!deadLetter) throw new NotFoundException('Dead-letter record not found');
      if (deadLetter.status !== JobDeadLetterStatus.OPEN) {
        throw new ConflictException('Dead-letter record is already resolved');
      }
      const updated = await tx.jobDeadLetter.update({
        where: { id },
        data: {
          status: JobDeadLetterStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedByUserId: actor.id,
          resolutionNote,
        },
      });
      await this.auditDeadLetterResolution(tx, updated, actor, request);
      return this.deadLetterResponse(updated);
    });
  }

  private jobIdentityWhere(
    id: string,
    scope: { tenantId?: string; outletId?: string; platformOnly: boolean },
  ): Prisma.BackgroundJobWhereInput {
    return {
      id,
      ...(scope.platformOnly ? { scope: OutboxEventScope.PLATFORM } : {}),
      ...(!scope.platformOnly && scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(!scope.platformOnly && scope.outletId ? { outletId: scope.outletId } : {}),
    };
  }

  private resolvePolicyWriteScope(
    actor: AuthenticatedUser,
    requestedScope: OutboxEventScope = OutboxEventScope.TENANT,
    requestedTenantId?: string,
  ): { scope: OutboxEventScope; scopeKey: string; tenantId: string | null } {
    if (requestedScope === OutboxEventScope.PLATFORM) {
      if (!hasRole(actor, PLATFORM_ADMIN_ROLE)) {
        throw new BadRequestException('Platform retry policy requires platform access');
      }
      if (requestedTenantId) {
        throw new BadRequestException('Platform retry policy cannot include tenantId');
      }
      return { scope: OutboxEventScope.PLATFORM, scopeKey: 'platform', tenantId: null };
    }
    if (requestedScope !== OutboxEventScope.TENANT) {
      throw new BadRequestException('Unsupported retry policy scope');
    }
    const tenantId = hasRole(actor, PLATFORM_ADMIN_ROLE)
      ? this.requiredText(requestedTenantId, 'tenantId', 36)
      : requireTenantId(actor);
    if (
      !hasRole(actor, PLATFORM_ADMIN_ROLE) &&
      requestedTenantId &&
      requestedTenantId !== tenantId
    ) {
      throw new BadRequestException('Cross-tenant retry policy management is forbidden');
    }
    return { scope: OutboxEventScope.TENANT, scopeKey: tenantId, tenantId };
  }

  private jobResponse(record: BackgroundJob) {
    return {
      id: record.id,
      scope: record.scope,
      scopeKey: record.scopeKey,
      tenantId: record.tenantId,
      outletId: record.outletId,
      outboxEventId: record.outboxEventId,
      jobType: record.jobType,
      aggregateType: record.aggregateType,
      aggregateId: record.aggregateId,
      idempotencyKey: record.idempotencyKey,
      redactedPayload: record.redactedPayload,
      status: record.status,
      priority: record.priority,
      attemptCount: record.attemptCount,
      maxAttempts: record.maxAttempts,
      availableAt: record.availableAt,
      lockedBy: record.lockedBy,
      lockedUntil: record.lockedUntil,
      lastErrorCode: record.lastErrorCode,
      lastErrorMessage: record.lastErrorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private retryPolicyResponse(record: BackgroundJobRetryPolicy) {
    return {
      id: record.id,
      scope: record.scope,
      scopeKey: record.scopeKey,
      tenantId: record.tenantId,
      jobType: record.jobType,
      maxAttempts: record.maxAttempts,
      initialDelaySeconds: record.initialDelaySeconds,
      maxDelaySeconds: record.maxDelaySeconds,
      backoffMultiplier: record.backoffMultiplier,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private deadLetterResponse(record: JobDeadLetter) {
    return {
      id: record.id,
      scope: record.scope,
      scopeKey: record.scopeKey,
      tenantId: record.tenantId,
      outletId: record.outletId,
      jobId: record.jobId,
      status: record.status,
      reasonCode: record.reasonCode,
      reasonMessage: record.reasonMessage,
      failedAt: record.failedAt,
      resolvedAt: record.resolvedAt,
      resolvedByUserId: record.resolvedByUserId,
      resolutionNote: record.resolutionNote,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private async auditJobAction(
    tx: Prisma.TransactionClient,
    record: BackgroundJob,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: 'retried' | 'cancelled',
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: record.tenantId,
      outletId: record.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: `jobs.${action}`,
      targetType: 'BackgroundJob',
      targetId: record.id,
      metadata: {
        jobType: record.jobType,
        status: record.status,
        attemptCount: record.attemptCount,
        ...metadata,
      },
      ...request,
    });
  }

  private async auditPolicyChange(
    tx: Prisma.TransactionClient,
    record: BackgroundJobRetryPolicy,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: record.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'jobs.retry_policy.upserted',
      targetType: 'BackgroundJobRetryPolicy',
      targetId: record.id,
      metadata: {
        jobType: record.jobType,
        maxAttempts: record.maxAttempts,
        initialDelaySeconds: record.initialDelaySeconds,
        maxDelaySeconds: record.maxDelaySeconds,
        backoffMultiplier: record.backoffMultiplier,
      },
      ...request,
    });
  }

  private async auditDeadLetterResolution(
    tx: Prisma.TransactionClient,
    record: JobDeadLetter,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: record.tenantId,
      outletId: record.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'jobs.dead_letter.resolved',
      targetType: 'JobDeadLetter',
      targetId: record.id,
      metadata: {
        jobId: record.jobId,
        reasonCode: record.reasonCode,
        resolutionNote: record.resolutionNote,
      },
      ...request,
    });
  }

  private requiredText(value: string | undefined, field: string, maxLength: number): string {
    const trimmed = value?.trim();
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
}
