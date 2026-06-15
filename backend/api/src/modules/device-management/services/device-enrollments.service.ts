import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditResult, DeviceEnrollmentStatus, DeviceStatus, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  ActivateDeviceEnrollmentDto,
  ApproveDeviceEnrollmentDto,
  DeviceEnrollmentQueryDto,
  RequestDeviceEnrollmentDto,
  TenantDeviceQueryDto,
} from '../dto/device.dto';
import {
  assertOutletAccess,
  requireDeviceActivate,
  requireDeviceEnroll,
  requireDeviceRead,
  resolveDeviceReadScope,
  resolveDeviceWriteScope,
} from './device-access.util';

const enrollmentSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  deviceId: true,
  status: true,
  activationCodeMasked: true,
  requestedByUserId: true,
  approvedByUserId: true,
  activatedByUserId: true,
  requestedAt: true,
  approvedAt: true,
  activatedAt: true,
  expiresAt: true,
  cancelledAt: true,
  cancellationReason: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeviceEnrollmentSelect;

const deviceForEnrollmentSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  deviceIdentifier: true,
  deviceType: true,
  status: true,
  version: true,
} satisfies Prisma.DeviceSelect;

type DeviceEnrollmentRecord = Prisma.DeviceEnrollmentGetPayload<{
  select: typeof enrollmentSelect;
}>;
type DeviceForEnrollment = Prisma.DeviceGetPayload<{
  select: typeof deviceForEnrollmentSelect;
}>;

@Injectable()
export class DeviceEnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async request(
    deviceId: string,
    dto: RequestDeviceEnrollmentDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDeviceEnroll(actor);
    const scope = resolveDeviceWriteScope(actor, dto.tenantId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + dto.expiresInMinutes * 60_000);
    const activationCode = this.generateActivationCode();
    const activationCodeHash = this.hashActivationCode(activationCode);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const device = await this.findDevice(tx, scope.tenantId, deviceId);
      assertOutletAccess(actor, device.outletId);
      if (device.status === DeviceStatus.ACTIVE || device.status === DeviceStatus.REVOKED) {
        throw new ConflictException('Only pending or disabled devices can request enrollment');
      }
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${scope.tenantId}:device-enrollment:${device.id}`}))`;
      await this.expireDueEnrollments(tx, scope.tenantId, device.id, now);
      const active = await tx.deviceEnrollment.findFirst({
        where: {
          tenantId: scope.tenantId,
          deviceId: device.id,
          status: { in: [DeviceEnrollmentStatus.REQUESTED, DeviceEnrollmentStatus.APPROVED] },
        },
        select: { id: true },
      });
      if (active) {
        throw new ConflictException('An active enrollment already exists for this device');
      }
      const enrollment = await tx.deviceEnrollment.create({
        data: {
          tenantId: scope.tenantId,
          outletId: device.outletId,
          deviceId: device.id,
          activationCodeHash,
          activationCodeMasked: this.maskActivationCode(activationCode),
          requestedByUserId: actor.id,
          expiresAt,
        },
        select: enrollmentSelect,
      });
      await this.auditEnrollment(tx, enrollment, actor, request, 'device.enrollment_requested', {
        deviceIdentifier: device.deviceIdentifier,
        deviceStatus: device.status,
      });
      return {
        ...this.toResponse(enrollment),
        activationCode,
      };
    });
  }

  async listForDevice(deviceId: string, query: DeviceEnrollmentQueryDto, actor: AuthenticatedUser) {
    requireDeviceRead(actor);
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const device = await tx.device.findFirst({
        where: { id: deviceId, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        select: deviceForEnrollmentSelect,
      });
      if (!device) throw new NotFoundException('Device not found');
      assertOutletAccess(actor, device.outletId);
      const where: Prisma.DeviceEnrollmentWhereInput = {
        deviceId,
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      };
      const skip = (query.page - 1) * query.limit;
      const [records, total] = await Promise.all([
        tx.deviceEnrollment.findMany({
          where,
          select: enrollmentSelect,
          orderBy: { requestedAt: 'desc' },
          skip,
          take: query.limit,
        }),
        tx.deviceEnrollment.count({ where }),
      ]);
      return {
        data: records.map((enrollment) => this.toResponse(enrollment)),
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
      const enrollment = await tx.deviceEnrollment.findFirst({
        where: { id, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
        select: enrollmentSelect,
      });
      if (!enrollment) throw new NotFoundException('Device enrollment not found');
      assertOutletAccess(actor, enrollment.outletId);
      return this.toResponse(enrollment);
    });
  }

  async approve(
    id: string,
    dto: ApproveDeviceEnrollmentDto,
    query: TenantDeviceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDeviceActivate(actor);
    const scope = resolveDeviceWriteScope(actor, query.tenantId);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const enrollment = await this.findEnrollment(tx, scope.tenantId, id);
      assertOutletAccess(actor, enrollment.outletId);
      if (enrollment.version !== dto.version) {
        throw new ConflictException('Device enrollment version conflict');
      }
      if (enrollment.status !== DeviceEnrollmentStatus.REQUESTED) {
        throw new ConflictException('Only requested enrollments can be approved');
      }
      if (enrollment.expiresAt <= now) {
        const expired = await this.markExpired(tx, enrollment, actor, request);
        return this.toResponse(expired);
      }
      const approved = await tx.deviceEnrollment.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id } },
        data: {
          status: DeviceEnrollmentStatus.APPROVED,
          approvedByUserId: actor.id,
          approvedAt: now,
          version: { increment: 1 },
        },
        select: enrollmentSelect,
      });
      await this.auditEnrollment(tx, approved, actor, request, 'device.enrollment_approved');
      return this.toResponse(approved);
    });
  }

  async activate(
    dto: ActivateDeviceEnrollmentDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDeviceActivate(actor);
    const scope = resolveDeviceWriteScope(actor, dto.tenantId);
    const deviceIdentifier = this.requiredText(dto.deviceIdentifier, 'deviceIdentifier');
    const activationCodeHash = this.hashActivationCode(
      this.requiredText(dto.activationCode, 'activationCode'),
    );
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const device = await tx.device.findUnique({
        where: {
          tenantId_deviceIdentifier: {
            tenantId: scope.tenantId,
            deviceIdentifier,
          },
        },
        select: deviceForEnrollmentSelect,
      });
      if (!device) throw new NotFoundException('Device not found');
      assertOutletAccess(actor, device.outletId);
      if (device.status === DeviceStatus.REVOKED) {
        throw new ConflictException('Revoked devices cannot be activated');
      }
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${scope.tenantId}:device-enrollment:${device.id}`}))`;
      await this.expireDueEnrollments(tx, scope.tenantId, device.id, now);
      const enrollment = await tx.deviceEnrollment.findFirst({
        where: {
          tenantId: scope.tenantId,
          deviceId: device.id,
          activationCodeHash,
          status: DeviceEnrollmentStatus.APPROVED,
          expiresAt: { gt: now },
        },
        select: enrollmentSelect,
      });
      if (!enrollment) {
        throw new BadRequestException('Activation code is invalid or expired');
      }
      const activatedEnrollment = await tx.deviceEnrollment.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id: enrollment.id } },
        data: {
          status: DeviceEnrollmentStatus.ACTIVATED,
          activatedByUserId: actor.id,
          activatedAt: now,
          version: { increment: 1 },
        },
        select: enrollmentSelect,
      });
      const activatedDevice = await tx.device.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id: device.id } },
        data: {
          status: DeviceStatus.ACTIVE,
          statusChangedAt: now,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
        select: deviceForEnrollmentSelect,
      });
      await this.auditEnrollment(
        tx,
        activatedEnrollment,
        actor,
        request,
        'device.enrollment_activated',
      );
      await this.auditDeviceActivation(tx, activatedDevice, actor, request, enrollment.id);
      return this.toResponse(activatedEnrollment);
    });
  }

  private async findDevice(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
  ): Promise<DeviceForEnrollment> {
    const device = await tx.device.findFirst({
      where: { tenantId, id: deviceId },
      select: deviceForEnrollmentSelect,
    });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  private async findEnrollment(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<DeviceEnrollmentRecord> {
    const enrollment = await tx.deviceEnrollment.findFirst({
      where: { tenantId, id },
      select: enrollmentSelect,
    });
    if (!enrollment) throw new NotFoundException('Device enrollment not found');
    return enrollment;
  }

  private async expireDueEnrollments(
    tx: Prisma.TransactionClient,
    tenantId: string,
    deviceId: string,
    now: Date,
  ): Promise<void> {
    await tx.deviceEnrollment.updateMany({
      where: {
        tenantId,
        deviceId,
        status: { in: [DeviceEnrollmentStatus.REQUESTED, DeviceEnrollmentStatus.APPROVED] },
        expiresAt: { lte: now },
      },
      data: {
        status: DeviceEnrollmentStatus.EXPIRED,
        version: { increment: 1 },
      },
    });
  }

  private async markExpired(
    tx: Prisma.TransactionClient,
    enrollment: DeviceEnrollmentRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<DeviceEnrollmentRecord> {
    const expired = await tx.deviceEnrollment.update({
      where: { tenantId_id: { tenantId: enrollment.tenantId, id: enrollment.id } },
      data: {
        status: DeviceEnrollmentStatus.EXPIRED,
        version: { increment: 1 },
      },
      select: enrollmentSelect,
    });
    await this.auditEnrollment(tx, expired, actor, request, 'device.enrollment_expired');
    return expired;
  }

  private async auditEnrollment(
    tx: Prisma.TransactionClient,
    enrollment: DeviceEnrollmentRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: enrollment.tenantId,
      outletId: enrollment.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'DeviceEnrollment',
      targetId: enrollment.id,
      result: AuditResult.SUCCESS,
      metadata: {
        deviceId: enrollment.deviceId,
        status: enrollment.status,
        expiresAt: enrollment.expiresAt.toISOString(),
        version: enrollment.version,
        ...extra,
      },
      ...request,
    });
  }

  private async auditDeviceActivation(
    tx: Prisma.TransactionClient,
    device: DeviceForEnrollment,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    enrollmentId: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: device.tenantId,
      outletId: device.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'device.activated',
      targetType: 'Device',
      targetId: device.id,
      result: AuditResult.SUCCESS,
      metadata: {
        enrollmentId,
        deviceIdentifier: device.deviceIdentifier,
        status: device.status,
        version: device.version,
      },
      ...request,
    });
  }

  private toResponse(enrollment: DeviceEnrollmentRecord) {
    return {
      id: enrollment.id,
      tenantId: enrollment.tenantId,
      outletId: enrollment.outletId,
      deviceId: enrollment.deviceId,
      status: enrollment.status,
      activationCodeMasked: enrollment.activationCodeMasked,
      requestedByUserId: enrollment.requestedByUserId,
      approvedByUserId: enrollment.approvedByUserId,
      activatedByUserId: enrollment.activatedByUserId,
      requestedAt: enrollment.requestedAt.toISOString(),
      approvedAt: enrollment.approvedAt?.toISOString() ?? null,
      activatedAt: enrollment.activatedAt?.toISOString() ?? null,
      expiresAt: enrollment.expiresAt.toISOString(),
      cancelledAt: enrollment.cancelledAt?.toISOString() ?? null,
      cancellationReason: enrollment.cancellationReason,
      version: enrollment.version,
      createdAt: enrollment.createdAt.toISOString(),
      updatedAt: enrollment.updatedAt.toISOString(),
    };
  }

  private generateActivationCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private hashActivationCode(code: string): string {
    return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  }

  private maskActivationCode(code: string): string {
    const normalized = code.trim().toUpperCase();
    return `******${normalized.slice(-2)}`;
  }

  private requiredText(value: string, field: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException(`${field} is required`);
    }
    return trimmed;
  }
}
