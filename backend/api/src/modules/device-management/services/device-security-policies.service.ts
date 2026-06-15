import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  DeviceSecurityPolicyStatus,
  OutletStatus,
  Prisma,
  TrustedSessionStatus,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CreateDeviceSecurityPolicyDto,
  DeviceSecurityPolicyQueryDto,
  EvaluateDeviceSecurityPolicyQueryDto,
  TenantDeviceQueryDto,
  UpdateDeviceSecurityPolicyDto,
} from '../dto/device.dto';
import {
  assertOutletAccess,
  requireDeviceRead,
  requireDeviceSecurityManage,
  resolveDeviceReadScope,
  resolveDeviceWriteScope,
} from './device-access.util';

const policySelect = {
  id: true,
  tenantId: true,
  outletId: true,
  name: true,
  status: true,
  requireTrustedSession: true,
  sessionTimeoutMinutes: true,
  forceLogoutBefore: true,
  allowedDeviceTypes: true,
  restrictions: true,
  createdByUserId: true,
  updatedByUserId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeviceSecurityPolicySelect;

const deviceForPolicySelect = {
  id: true,
  tenantId: true,
  outletId: true,
  deviceIdentifier: true,
  deviceType: true,
  status: true,
} satisfies Prisma.DeviceSelect;

type PolicyRecord = Prisma.DeviceSecurityPolicyGetPayload<{ select: typeof policySelect }>;
type DeviceForPolicy = Prisma.DeviceGetPayload<{ select: typeof deviceForPolicySelect }>;

@Injectable()
export class DeviceSecurityPoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateDeviceSecurityPolicyDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDeviceSecurityManage(actor);
    const scope = resolveDeviceWriteScope(actor, dto.tenantId);
    const outletId = this.optionalUuid(dto.outletId);
    assertOutletAccess(actor, outletId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      if (outletId !== null) {
        await this.assertOutletExists(tx, scope.tenantId, outletId);
      }
      await this.assertNoActivePolicy(tx, scope.tenantId, outletId);
      const policy = await tx.deviceSecurityPolicy.create({
        data: {
          tenantId: scope.tenantId,
          outletId,
          name: this.requiredText(dto.name, 'name'),
          requireTrustedSession: dto.requireTrustedSession,
          sessionTimeoutMinutes: dto.sessionTimeoutMinutes,
          forceLogoutBefore: this.optionalDate(dto.forceLogoutBefore),
          allowedDeviceTypes: dto.allowedDeviceTypes,
          restrictions:
            dto.restrictions === undefined
              ? undefined
              : dto.restrictions === null
                ? Prisma.JsonNull
                : (dto.restrictions as Prisma.InputJsonValue),
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        select: policySelect,
      });
      const revokedSessions = await this.applyForcedLogout(tx, policy, actor);
      await this.auditPolicy(tx, policy, actor, request, 'device_security_policy.created', {
        revokedSessions,
      });
      return this.toResponse(policy, revokedSessions);
    });
  }

  async list(query: DeviceSecurityPolicyQueryDto, actor: AuthenticatedUser) {
    requireDeviceRead(actor);
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    const outletId = this.constrainOutlet(actor, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.DeviceSecurityPolicyWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(outletId !== undefined ? { outletId } : {}),
        ...(query.status ? { status: query.status } : {}),
      };
      const skip = (query.page - 1) * query.limit;
      const [records, total] = await Promise.all([
        tx.deviceSecurityPolicy.findMany({
          where,
          select: policySelect,
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: query.limit,
        }),
        tx.deviceSecurityPolicy.count({ where }),
      ]);
      return {
        data: records.map((policy) => this.toResponse(policy)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: TenantDeviceQueryDto, actor: AuthenticatedUser) {
    requireDeviceRead(actor);
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const policy = await tx.deviceSecurityPolicy.findFirst({
        where: { id, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        select: policySelect,
      });
      if (!policy) throw new NotFoundException('Device security policy not found');
      assertOutletAccess(actor, policy.outletId);
      return this.toResponse(policy);
    });
  }

  async update(
    id: string,
    dto: UpdateDeviceSecurityPolicyDto,
    query: TenantDeviceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDeviceSecurityManage(actor);
    const scope = resolveDeviceWriteScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findPolicy(tx, scope.tenantId, id);
      assertOutletAccess(actor, existing.outletId);
      if (existing.version !== dto.version) {
        throw new ConflictException('Device security policy version conflict');
      }
      if (
        dto.status === DeviceSecurityPolicyStatus.ACTIVE &&
        existing.status !== DeviceSecurityPolicyStatus.ACTIVE
      ) {
        await this.assertNoActivePolicy(tx, scope.tenantId, existing.outletId, id);
      }
      const updated = await tx.deviceSecurityPolicy.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id } },
        data: {
          ...(dto.name ? { name: this.requiredText(dto.name, 'name') } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.requireTrustedSession !== undefined
            ? { requireTrustedSession: dto.requireTrustedSession }
            : {}),
          ...(dto.sessionTimeoutMinutes !== undefined
            ? { sessionTimeoutMinutes: dto.sessionTimeoutMinutes }
            : {}),
          ...(dto.forceLogoutBefore !== undefined
            ? { forceLogoutBefore: this.optionalDate(dto.forceLogoutBefore) }
            : {}),
          ...(dto.allowedDeviceTypes !== undefined
            ? { allowedDeviceTypes: dto.allowedDeviceTypes }
            : {}),
          ...(dto.restrictions !== undefined
            ? {
                restrictions:
                  dto.restrictions === null
                    ? Prisma.JsonNull
                    : (dto.restrictions as Prisma.InputJsonValue),
              }
            : {}),
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
        select: policySelect,
      });
      const revokedSessions = await this.applyForcedLogout(tx, updated, actor);
      await this.auditPolicy(tx, updated, actor, request, 'device_security_policy.updated', {
        previousStatus: existing.status,
        newStatus: updated.status,
        revokedSessions,
      });
      return this.toResponse(updated, revokedSessions);
    });
  }

  async evaluate(
    deviceId: string,
    query: EvaluateDeviceSecurityPolicyQueryDto,
    actor: AuthenticatedUser,
  ) {
    requireDeviceRead(actor);
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const device = await tx.device.findFirst({
        where: { id: deviceId, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        select: deviceForPolicySelect,
      });
      if (!device) throw new NotFoundException('Device not found');
      assertOutletAccess(actor, device.outletId);
      const policy = await this.findEffectivePolicy(tx, device);
      return this.toEvaluation(device, policy);
    });
  }

  private async assertOutletExists(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
  ): Promise<void> {
    const outlet = await tx.outlet.findFirst({
      where: { tenantId, id: outletId, deletedAt: null, status: { not: OutletStatus.CLOSED } },
      select: { id: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
  }

  private async assertNoActivePolicy(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string | null,
    excludePolicyId?: string,
  ): Promise<void> {
    const existing = await tx.deviceSecurityPolicy.findFirst({
      where: {
        tenantId,
        outletId,
        status: DeviceSecurityPolicyStatus.ACTIVE,
        ...(excludePolicyId ? { id: { not: excludePolicyId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An active device security policy already exists for this scope');
    }
  }

  private async findPolicy(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<PolicyRecord> {
    const policy = await tx.deviceSecurityPolicy.findFirst({
      where: { tenantId, id },
      select: policySelect,
    });
    if (!policy) throw new NotFoundException('Device security policy not found');
    return policy;
  }

  private async findEffectivePolicy(
    tx: Prisma.TransactionClient,
    device: DeviceForPolicy,
  ): Promise<PolicyRecord | null> {
    return tx.deviceSecurityPolicy.findFirst({
      where: {
        tenantId: device.tenantId,
        status: DeviceSecurityPolicyStatus.ACTIVE,
        OR: [{ outletId: device.outletId }, { outletId: null }],
      },
      select: policySelect,
      orderBy: [{ outletId: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private async applyForcedLogout(
    tx: Prisma.TransactionClient,
    policy: PolicyRecord,
    actor: AuthenticatedUser,
  ): Promise<number> {
    if (policy.status !== DeviceSecurityPolicyStatus.ACTIVE || !policy.forceLogoutBefore) {
      return 0;
    }
    const result = await tx.trustedSession.updateMany({
      where: {
        tenantId: policy.tenantId,
        ...(policy.outletId ? { outletId: policy.outletId } : {}),
        status: TrustedSessionStatus.ACTIVE,
        trustedAt: { lt: policy.forceLogoutBefore },
      },
      data: {
        status: TrustedSessionStatus.REVOKED,
        revokedAt: new Date(),
        revokedByUserId: actor.id,
        revocationReason: `Forced logout by device security policy ${policy.id}`,
        version: { increment: 1 },
      },
    });
    return result.count;
  }

  private constrainOutlet(
    actor: AuthenticatedUser,
    requestedOutletId?: string,
  ): string | undefined {
    if (actor.roles.includes('SUPER_ADMIN') || actor.roles.includes('TENANT_ADMIN')) {
      return requestedOutletId;
    }
    if (!actor.outletId) {
      return requestedOutletId;
    }
    if (requestedOutletId && requestedOutletId !== actor.outletId) {
      throw new ConflictException('Outlet device access is forbidden');
    }
    return actor.outletId;
  }

  private async auditPolicy(
    tx: Prisma.TransactionClient,
    policy: PolicyRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: policy.tenantId,
      outletId: policy.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'DeviceSecurityPolicy',
      targetId: policy.id,
      result: AuditResult.SUCCESS,
      metadata: {
        status: policy.status,
        requireTrustedSession: policy.requireTrustedSession,
        sessionTimeoutMinutes: policy.sessionTimeoutMinutes,
        forceLogoutBefore: policy.forceLogoutBefore?.toISOString() ?? null,
        allowedDeviceTypes: policy.allowedDeviceTypes,
        version: policy.version,
        ...extra,
      },
      ...request,
    });
  }

  private toEvaluation(device: DeviceForPolicy, policy: PolicyRecord | null) {
    const allowedDeviceTypes = policy?.allowedDeviceTypes ?? [];
    const allowedDeviceType =
      allowedDeviceTypes.length === 0 || allowedDeviceTypes.includes(device.deviceType);
    return {
      deviceId: device.id,
      tenantId: device.tenantId,
      outletId: device.outletId,
      policyId: policy?.id ?? null,
      policyScope: policy ? (policy.outletId ? 'OUTLET' : 'TENANT') : 'DEFAULT',
      requireTrustedSession: policy?.requireTrustedSession ?? false,
      sessionTimeoutMinutes: policy?.sessionTimeoutMinutes ?? 1440,
      forceLogoutBefore: policy?.forceLogoutBefore?.toISOString() ?? null,
      allowedDeviceTypes,
      allowedDeviceType,
      restrictions: policy?.restrictions ?? null,
    };
  }

  private toResponse(policy: PolicyRecord, revokedSessions = 0) {
    return {
      id: policy.id,
      tenantId: policy.tenantId,
      outletId: policy.outletId,
      name: policy.name,
      status: policy.status,
      requireTrustedSession: policy.requireTrustedSession,
      sessionTimeoutMinutes: policy.sessionTimeoutMinutes,
      forceLogoutBefore: policy.forceLogoutBefore?.toISOString() ?? null,
      allowedDeviceTypes: policy.allowedDeviceTypes,
      restrictions: policy.restrictions,
      createdByUserId: policy.createdByUserId,
      updatedByUserId: policy.updatedByUserId,
      version: policy.version,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
      revokedSessions,
    };
  }

  private requiredText(value: string, field: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new BadRequestException(`${field} is required`);
    return trimmed;
  }

  private optionalUuid(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private optionalDate(value?: string | null): Date | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : new Date(trimmed);
  }
}
