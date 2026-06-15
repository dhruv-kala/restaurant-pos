import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditResult, DeviceStatus, DeviceType, OutletStatus, Prisma } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  DeviceQueryDto,
  RegisterDeviceDto,
  TenantDeviceQueryDto,
  UpdateDeviceStatusDto,
} from '../dto/device.dto';
import {
  assertOutletAccess,
  constrainOutletForActor,
  requireDeviceRead,
  requireDeviceRegister,
  requireDeviceStatusUpdate,
  resolveDeviceReadScope,
  resolveDeviceWriteScope,
} from './device-access.util';

const deviceSelect = {
  id: true,
  tenantId: true,
  outletId: true,
  deviceIdentifier: true,
  name: true,
  deviceType: true,
  status: true,
  platform: true,
  manufacturer: true,
  model: true,
  osVersion: true,
  appVersion: true,
  serialNumber: true,
  metadata: true,
  registeredByUserId: true,
  updatedByUserId: true,
  registeredAt: true,
  lastSeenAt: true,
  statusChangedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeviceSelect;

type DeviceRecord = Prisma.DeviceGetPayload<{ select: typeof deviceSelect }>;

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDeviceDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireDeviceRegister(actor);
    const scope = resolveDeviceWriteScope(actor, dto.tenantId);
    const outletId = this.optionalUuid(dto.outletId);
    assertOutletAccess(actor, outletId);
    if (this.requiresOutlet(dto.deviceType) && outletId === null) {
      throw new BadRequestException('Operational devices require outletId');
    }

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.assertTenantExists(tx, scope.tenantId);
      if (outletId !== null) {
        await this.assertOutletExists(tx, scope.tenantId, outletId);
      }
      const deviceIdentifier = this.requiredText(dto.deviceIdentifier, 'deviceIdentifier');
      const name = this.requiredText(dto.name, 'name');
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${scope.tenantId}:device:${deviceIdentifier.toLowerCase()}`}))`;
      const existing = await tx.device.findUnique({
        where: {
          tenantId_deviceIdentifier: {
            tenantId: scope.tenantId,
            deviceIdentifier,
          },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Device identifier already exists for this tenant');
      }
      const device = await tx.device.create({
        data: {
          tenantId: scope.tenantId,
          outletId,
          deviceIdentifier,
          name,
          deviceType: dto.deviceType,
          status: DeviceStatus.PENDING,
          platform: this.optionalText(dto.platform),
          manufacturer: this.optionalText(dto.manufacturer),
          model: this.optionalText(dto.model),
          osVersion: this.optionalText(dto.osVersion),
          appVersion: this.optionalText(dto.appVersion),
          serialNumber: this.optionalText(dto.serialNumber),
          metadata:
            dto.metadata === undefined
              ? undefined
              : dto.metadata === null
                ? Prisma.JsonNull
                : (dto.metadata as Prisma.InputJsonValue),
          registeredByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        select: deviceSelect,
      });
      await this.auditDevice(tx, device, actor, request, 'device.registered');
      return this.toResponse(device);
    });
  }

  async list(query: DeviceQueryDto, actor: AuthenticatedUser) {
    requireDeviceRead(actor);
    const scope = resolveDeviceReadScope(actor, query.tenantId);
    const outletId = constrainOutletForActor(actor, query.outletId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.DeviceWhereInput = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(outletId ? { outletId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.deviceType ? { deviceType: query.deviceType } : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
                {
                  deviceIdentifier: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                { serialNumber: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const skip = (query.page - 1) * query.limit;
      const [records, total] = await Promise.all([
        tx.device.findMany({
          where,
          select: deviceSelect,
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: query.limit,
        }),
        tx.device.count({ where }),
      ]);
      return {
        data: records.map((device) => this.toResponse(device)),
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
      const device = await tx.device.findFirst({
        where: {
          id,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
        select: deviceSelect,
      });
      if (!device) throw new NotFoundException('Device not found');
      assertOutletAccess(actor, device.outletId);
      return this.toResponse(device);
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateDeviceStatusDto,
    query: TenantDeviceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireDeviceStatusUpdate(actor);
    const scope = resolveDeviceWriteScope(actor, query.tenantId);
    if (dto.status === DeviceStatus.PENDING) {
      throw new BadRequestException('Use device registration to create pending devices');
    }
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await tx.device.findFirst({
        where: { tenantId: scope.tenantId, id },
        select: deviceSelect,
      });
      if (!existing) throw new NotFoundException('Device not found');
      assertOutletAccess(actor, existing.outletId);
      if (existing.version !== dto.version) {
        throw new ConflictException('Device version conflict');
      }
      if (existing.status === dto.status) {
        return this.toResponse(existing);
      }
      const updated = await tx.device.update({
        where: { tenantId_id: { tenantId: scope.tenantId, id } },
        data: {
          status: dto.status,
          statusChangedAt: new Date(),
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
        select: deviceSelect,
      });
      await this.auditDevice(tx, updated, actor, request, 'device.status_changed', {
        previousStatus: existing.status,
        newStatus: updated.status,
      });
      return this.toResponse(updated);
    });
  }

  private async assertTenantExists(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  private async assertOutletExists(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
  ): Promise<void> {
    const outlet = await tx.outlet.findFirst({
      where: {
        tenantId,
        id: outletId,
        deletedAt: null,
        status: { not: OutletStatus.CLOSED },
      },
      select: { id: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
  }

  private requiresOutlet(type: DeviceType): boolean {
    return type !== DeviceType.ADMIN_WORKSTATION;
  }

  private async auditDevice(
    tx: Prisma.TransactionClient,
    device: DeviceRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: device.tenantId,
      outletId: device.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'Device',
      targetId: device.id,
      result: AuditResult.SUCCESS,
      metadata: {
        deviceIdentifier: device.deviceIdentifier,
        deviceType: device.deviceType,
        status: device.status,
        version: device.version,
        ...extra,
      },
      ...request,
    });
  }

  private toResponse(device: DeviceRecord) {
    return {
      id: device.id,
      tenantId: device.tenantId,
      outletId: device.outletId,
      deviceIdentifier: device.deviceIdentifier,
      name: device.name,
      deviceType: device.deviceType,
      status: device.status,
      platform: device.platform,
      manufacturer: device.manufacturer,
      model: device.model,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      serialNumber: device.serialNumber,
      metadata: device.metadata,
      registeredByUserId: device.registeredByUserId,
      updatedByUserId: device.updatedByUserId,
      registeredAt: device.registeredAt.toISOString(),
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
      statusChangedAt: device.statusChangedAt?.toISOString() ?? null,
      version: device.version,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };
  }

  private requiredText(value: string, field: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException(`${field} is required`);
    }
    return trimmed;
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private optionalUuid(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
}
