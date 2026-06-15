import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  DeviceSecurityPolicyStatus,
  DeviceStatus,
  Prisma,
  TrustedSessionStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CreateTrustedSessionDto,
  RenewTrustedSessionDto,
  RevokeTrustedSessionDto,
  TenantDeviceQueryDto,
  TrustedSessionQueryDto,
} from '../dto/device.dto';
import {
  assertOutletAccess,
  canManageTrustedSessions,
  resolveDeviceReadScope,
  resolveDeviceWriteScope,
} from './device-access.util';

const trustedSessionSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  deviceId: true,
  userId: true,
  status: true,
  sessionTokenMasked: true,
  trustedAt: true,
  lastRenewedAt: true,
  expiresAt: true,
  revokedAt: true,
  revokedByUserId: true,
  revocationReason: true,
  userAgent: true,
  ipAddress: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TrustedSessionSelect;

const deviceForSessionSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  deviceIdentifier: true,
  deviceType: true,
  status: true,
} satisfies Prisma.DeviceSelect;

type TrustedSessionRecord = Prisma.TrustedSessionGetPayload<{
  select: typeof trustedSessionSelect;
}>;
type DeviceForSession = Prisma.DeviceGetPayload<{ select: typeof deviceForSessionSelect }>;
type EffectiveSecurityPolicy = {
  id: string;
  requireTrustedSession: boolean;
  sessionTimeoutMinutes: number;
  forceLogoutBefore: Date | null;
  allowedDeviceTypes: DeviceForSession['deviceType'][];
} | null;

@Injectable()
export class TrustedSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    deviceId: string,
    dto: CreateTrustedSessionDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    const scope = resolveDeviceWriteScope(actor, dto.tenantId);
    const now = new Date();
    const sessionToken = this.generateSessionToken();
    const sessionTokenHash = this.hashSessionToken(sessionToken);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const device = await this.findDevice(tx, scope.tenantId, deviceId);
      assertOutletAccess(actor, device.outletId);
      if (device.status !== DeviceStatus.ACTIVE) {
        throw new ConflictException('Trusted sessions require an active device');
      }
      const policy = await this.findEffectiveSecurityPolicy(tx, device);
      this.assertPolicyAllowsDevice(device, policy);
      const expiresAt = this.resolveSessionExpiry(now, dto.expiresInMinutes, policy);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${scope.tenantId}:trusted-session:${device.id}:${actor.id}`}))`;
      await this.expireDueSessions(tx, scope.tenantId, device.id, actor.id, now);
      const active = await tx.trustedSession.findFirst({
        where: {
          tenantId: scope.tenantId,
          deviceId: device.id,
          userId: actor.id,
          status: TrustedSessionStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (active) {
        throw new ConflictException(
          'An active trusted session already exists for this device user',
        );
      }
      const session = await tx.trustedSession.create({
        data: {
          tenantId: scope.tenantId,
          outletId: device.outletId,
          deviceId: device.id,
          userId: actor.id,
          sessionTokenHash,
          sessionTokenMasked: this.maskSessionToken(sessionToken),
          expiresAt,
          userAgent: this.optionalText(dto.userAgent),
          ipAddress: this.optionalText(dto.ipAddress),
        },
        select: trustedSessionSelect,
      });
      await this.auditSession(tx, session, actor, request, 'trusted_session.created', {
        deviceIdentifier: device.deviceIdentifier,
      });
      return {
        ...this.toResponse(session),
        sessionToken,
      };
    });
  }

  async list(query: TrustedSessionQueryDto, actor: AuthenticatedUser) {
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.buildReadableWhere(query, actor, scope.tenantId);
      const skip = (query.page - 1) * query.limit;
      const [records, total] = await Promise.all([
        tx.trustedSession.findMany({
          where,
          select: trustedSessionSelect,
          orderBy: [{ updatedAt: 'desc' }, { trustedAt: 'desc' }],
          skip,
          take: query.limit,
        }),
        tx.trustedSession.count({ where }),
      ]);
      return {
        data: records.map((session) => this.toResponse(session)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async listForDevice(deviceId: string, query: TrustedSessionQueryDto, actor: AuthenticatedUser) {
    return this.list({ ...query, deviceId }, actor);
  }

  async detail(id: string, query: TenantDeviceQueryDto, actor: AuthenticatedUser) {
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const session = await tx.trustedSession.findFirst({
        where: { id, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        select: trustedSessionSelect,
      });
      if (!session) throw new NotFoundException('Trusted session not found');
      this.assertSessionReadable(actor, session);
      return this.toResponse(session);
    });
  }

  async renew(
    id: string,
    dto: RenewTrustedSessionDto,
    query: TenantDeviceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    const scope = resolveDeviceWriteScope(actor, query.tenantId);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const session = await this.findSession(tx, scope.tenantId, id);
      this.assertSessionWritable(actor, session);
      if (session.version !== dto.version) {
        throw new ConflictException('Trusted session version conflict');
      }
      if (session.status !== TrustedSessionStatus.ACTIVE) {
        throw new ConflictException('Only active trusted sessions can be renewed');
      }
      if (session.expiresAt <= now) {
        const expired = await this.markExpired(tx, session, actor, request);
        return this.toResponse(expired);
      }
      const device = await this.findDevice(tx, scope.tenantId, session.deviceId);
      const policy = await this.findEffectiveSecurityPolicy(tx, device);
      this.assertPolicyAllowsDevice(device, policy);
      const expiresAt = this.resolveSessionExpiry(now, dto.expiresInMinutes, policy);
      const renewed = await tx.trustedSession.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id } },
        data: {
          lastRenewedAt: now,
          expiresAt,
          version: { increment: 1 },
        },
        select: trustedSessionSelect,
      });
      await this.auditSession(tx, renewed, actor, request, 'trusted_session.renewed');
      return this.toResponse(renewed);
    });
  }

  async revoke(
    id: string,
    dto: RevokeTrustedSessionDto,
    query: TenantDeviceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    const scope = resolveDeviceWriteScope(actor, query.tenantId);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const session = await this.findSession(tx, scope.tenantId, id);
      this.assertSessionWritable(actor, session);
      if (session.version !== dto.version) {
        throw new ConflictException('Trusted session version conflict');
      }
      if (session.status === TrustedSessionStatus.REVOKED) {
        return this.toResponse(session);
      }
      const revoked = await tx.trustedSession.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id } },
        data: {
          status: TrustedSessionStatus.REVOKED,
          revokedAt: now,
          revokedByUserId: actor.id,
          revocationReason: this.optionalText(dto.reason),
          version: { increment: 1 },
        },
        select: trustedSessionSelect,
      });
      await this.auditSession(tx, revoked, actor, request, 'trusted_session.revoked', {
        previousStatus: session.status,
      });
      return this.toResponse(revoked);
    });
  }

  private async findDevice(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
  ): Promise<DeviceForSession> {
    const device = await tx.device.findFirst({
      where: { tenantId, id: deviceId },
      select: deviceForSessionSelect,
    });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  private async findSession(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<TrustedSessionRecord> {
    const session = await tx.trustedSession.findFirst({
      where: { tenantId, id },
      select: trustedSessionSelect,
    });
    if (!session) throw new NotFoundException('Trusted session not found');
    return session;
  }

  private async findEffectiveSecurityPolicy(
    tx: Prisma.TransactionClient,
    device: DeviceForSession,
  ): Promise<EffectiveSecurityPolicy> {
    return tx.deviceSecurityPolicy.findFirst({
      where: {
        tenantId: device.tenantId,
        status: DeviceSecurityPolicyStatus.ACTIVE,
        OR: [{ outletId: device.outletId }, { outletId: null }],
      },
      select: {
        id: true,
        requireTrustedSession: true,
        sessionTimeoutMinutes: true,
        forceLogoutBefore: true,
        allowedDeviceTypes: true,
      },
      orderBy: [{ outletId: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private assertPolicyAllowsDevice(
    device: DeviceForSession,
    policy: EffectiveSecurityPolicy,
  ): void {
    if (!policy || policy.allowedDeviceTypes.length === 0) return;
    if (!policy.allowedDeviceTypes.includes(device.deviceType)) {
      throw new ConflictException('Device type is blocked by the active security policy');
    }
  }

  private resolveSessionExpiry(
    now: Date,
    requestedMinutes: number,
    policy: EffectiveSecurityPolicy,
  ): Date {
    const policyMinutes = policy?.sessionTimeoutMinutes ?? requestedMinutes;
    const effectiveMinutes = Math.min(requestedMinutes, policyMinutes);
    return new Date(now.getTime() + effectiveMinutes * 60_000);
  }

  private buildReadableWhere(
    query: TrustedSessionQueryDto,
    actor: AuthenticatedUser,
    tenantId?: string,
  ): Prisma.TrustedSessionWhereInput {
    const where: Prisma.TrustedSessionWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(query.deviceId ? { deviceId: query.deviceId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    if (canManageTrustedSessions(actor)) {
      if (query.userId) where.userId = query.userId;
      return where;
    }
    where.userId = actor.id;
    if (actor.outletId) where.outletId = actor.outletId;
    return where;
  }

  private assertSessionReadable(actor: AuthenticatedUser, session: TrustedSessionRecord): void {
    if (canManageTrustedSessions(actor)) {
      assertOutletAccess(actor, session.outletId);
      return;
    }
    if (session.userId === actor.id) {
      assertOutletAccess(actor, session.outletId);
      return;
    }
    throw new ForbiddenException('Trusted session access is forbidden');
  }

  private assertSessionWritable(actor: AuthenticatedUser, session: TrustedSessionRecord): void {
    if (canManageTrustedSessions(actor)) {
      assertOutletAccess(actor, session.outletId);
      return;
    }
    if (session.userId === actor.id) {
      assertOutletAccess(actor, session.outletId);
      return;
    }
    throw new ForbiddenException('Trusted session ownership is required');
  }

  private async expireDueSessions(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
    userId: string,
    now: Date,
  ): Promise<void> {
    await tx.trustedSession.updateMany({
      where: {
        tenantId,
        deviceId,
        userId,
        status: TrustedSessionStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: {
        status: TrustedSessionStatus.EXPIRED,
        version: { increment: 1 },
      },
    });
  }

  private async markExpired(
    tx: Prisma.TransactionClient,
    session: TrustedSessionRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<TrustedSessionRecord> {
    const expired = await tx.trustedSession.update({
      where: { tenantId_id: { tenantId: session.tenantId, id: session.id } },
      data: {
        status: TrustedSessionStatus.EXPIRED,
        version: { increment: 1 },
      },
      select: trustedSessionSelect,
    });
    await this.auditSession(tx, expired, actor, request, 'trusted_session.expired');
    return expired;
  }

  private async auditSession(
    tx: Prisma.TransactionClient,
    session: TrustedSessionRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: session.tenantId,
      outletId: session.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'TrustedSession',
      targetId: session.id,
      result: AuditResult.SUCCESS,
      metadata: {
        deviceId: session.deviceId,
        userId: session.userId,
        status: session.status,
        expiresAt: session.expiresAt.toISOString(),
        version: session.version,
        ...extra,
      },
      ...request,
    });
  }

  private toResponse(session: TrustedSessionRecord) {
    return {
      id: session.id,
      tenantId: session.tenantId,
      outletId: session.outletId,
      deviceId: session.deviceId,
      userId: session.userId,
      status: session.status,
      sessionTokenMasked: session.sessionTokenMasked,
      trustedAt: session.trustedAt.toISOString(),
      lastRenewedAt: session.lastRenewedAt?.toISOString() ?? null,
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
      revokedByUserId: session.revokedByUserId,
      revocationReason: session.revocationReason,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      version: session.version,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private generateSessionToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashSessionToken(token: string): string {
    return createHash('sha256').update(token.trim()).digest('hex');
  }

  private maskSessionToken(token: string): string {
    const normalized = token.trim();
    return `******${normalized.slice(-6)}`;
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    return trimmed;
  }
}
