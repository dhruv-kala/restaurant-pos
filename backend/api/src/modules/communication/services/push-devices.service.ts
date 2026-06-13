import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunicationPushDeviceStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'node:crypto';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type { RegisterPushDeviceDto } from '../dto/push-device.dto';
import { CommunicationAddressProtector } from './communication-address-protector';

export interface PushDeliveryDestination {
  pushDeviceId: string;
  recipientAddressCiphertext: string;
  recipientAddressHash: string;
  recipientAddressMasked: string;
}

@Injectable()
export class PushDevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly addresses: CommunicationAddressProtector,
  ) {}

  async list(actor: AuthenticatedUser) {
    const tenantId = this.tenantId(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const devices = await tx.communicationPushDevice.findMany({
        where: { tenantId, userId: actor.id },
        orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
      });
      return devices.map((device) => this.response(device));
    });
  }

  async register(
    dto: RegisterPushDeviceDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    const tenantId = this.tenantId(actor);
    const token = this.token(dto.token);
    const tokenHash = this.hash(token);
    const deviceId = dto.deviceId.trim();
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:push-token:${tokenHash}`}))`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:push-installation:${actor.id}:${dto.application}:${deviceId}`}))`;
      const existing = await tx.communicationPushDevice.findUnique({
        where: {
          tenantId_userId_application_deviceId: {
            tenantId,
            userId: actor.id,
            application: dto.application,
            deviceId,
          },
        },
      });
      const now = new Date();
      await tx.communicationPushDevice.updateMany({
        where: {
          tenantId,
          tokenHash,
          status: CommunicationPushDeviceStatus.ACTIVE,
          ...(existing ? { id: { not: existing.id } } : {}),
        },
        data: {
          status: CommunicationPushDeviceStatus.INACTIVE,
          deactivatedAt: now,
          invalidReason: 'TOKEN_REASSIGNED',
        },
      });
      const protectedToken = {
        tokenCiphertext: this.addresses.encrypt(token),
        tokenHash,
        tokenMasked: this.mask(token),
      };
      const device = existing
        ? await tx.communicationPushDevice.update({
            where: { tenantId_id: { tenantId, id: existing.id } },
            data: {
              outletId: actor.outletId,
              platform: dto.platform,
              ...protectedToken,
              status: CommunicationPushDeviceStatus.ACTIVE,
              lastRegisteredAt: now,
              lastSeenAt: now,
              deactivatedAt: null,
              invalidatedAt: null,
              invalidReason: null,
            },
          })
        : await tx.communicationPushDevice.create({
            data: {
              tenantId,
              outletId: actor.outletId,
              userId: actor.id,
              application: dto.application,
              platform: dto.platform,
              deviceId,
              ...protectedToken,
              lastRegisteredAt: now,
              lastSeenAt: now,
            },
          });
      await this.audit.append(tx, {
        tenantId,
        outletId: actor.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'communication.push_device.registered',
        targetType: 'CommunicationPushDevice',
        targetId: device.id,
        metadata: {
          application: device.application,
          platform: device.platform,
          reactivated: Boolean(existing),
        },
        ...request,
      });
      return this.response(device);
    });
  }

  async unregister(
    id: string,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    const tenantId = this.tenantId(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const device = await tx.communicationPushDevice.findFirst({
        where: { id, tenantId, userId: actor.id },
      });
      if (!device) throw new NotFoundException('Push device not found');
      if (device.status === CommunicationPushDeviceStatus.ACTIVE) {
        await tx.communicationPushDevice.update({
          where: { tenantId_id: { tenantId, id } },
          data: {
            status: CommunicationPushDeviceStatus.INACTIVE,
            deactivatedAt: new Date(),
            invalidatedAt: null,
            invalidReason: 'USER_UNREGISTERED',
          },
        });
        await this.audit.append(tx, {
          tenantId,
          outletId: device.outletId,
          actorUserId: actor.id,
          actorRoles: actor.roles,
          action: 'communication.push_device.unregistered',
          targetType: 'CommunicationPushDevice',
          targetId: id,
          ...request,
        });
      }
      return {
        id,
        status:
          device.status === CommunicationPushDeviceStatus.ACTIVE
            ? CommunicationPushDeviceStatus.INACTIVE
            : device.status,
      };
    });
  }

  async activeDestinations(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ): Promise<PushDeliveryDestination[]> {
    const devices = await transaction.communicationPushDevice.findMany({
      where: {
        tenantId,
        userId,
        status: CommunicationPushDeviceStatus.ACTIVE,
      },
      orderBy: { lastSeenAt: 'desc' },
    });
    return devices.map((device) => ({
      pushDeviceId: device.id,
      recipientAddressCiphertext: device.tokenCiphertext,
      recipientAddressHash: device.tokenHash,
      recipientAddressMasked: device.tokenMasked,
    }));
  }

  async deactivateInvalidToken(
    transaction: Prisma.TransactionClient,
    input: {
      tenantId: string;
      tokenHash: string;
      reason: string;
      actor: AuthenticatedUser;
      request: AuditRequestMetadata;
    },
  ): Promise<number> {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.tenantId}:push-token:${input.tokenHash}`}))`;
    const devices = await transaction.communicationPushDevice.findMany({
      where: {
        tenantId: input.tenantId,
        tokenHash: input.tokenHash,
        status: CommunicationPushDeviceStatus.ACTIVE,
      },
      select: { id: true, outletId: true },
    });
    if (devices.length === 0) return 0;
    const now = new Date();
    await transaction.communicationPushDevice.updateMany({
      where: {
        tenantId: input.tenantId,
        id: { in: devices.map((device) => device.id) },
        status: CommunicationPushDeviceStatus.ACTIVE,
      },
      data: {
        status: CommunicationPushDeviceStatus.INVALID,
        deactivatedAt: now,
        invalidatedAt: now,
        invalidReason: input.reason.slice(0, 120),
      },
    });
    for (const device of devices) {
      await this.audit.append(transaction, {
        tenantId: input.tenantId,
        outletId: device.outletId,
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
        action: 'communication.push_device.invalidated',
        targetType: 'CommunicationPushDevice',
        targetId: device.id,
        reason: input.reason,
        ...input.request,
      });
    }
    return devices.length;
  }

  private response(device: {
    id: string;
    application: string;
    platform: string;
    deviceId: string;
    tokenMasked: string;
    status: CommunicationPushDeviceStatus;
    lastRegisteredAt: Date;
    lastSeenAt: Date;
    deactivatedAt: Date | null;
    invalidatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: device.id,
      application: device.application,
      platform: device.platform,
      deviceId: device.deviceId,
      tokenMasked: device.tokenMasked,
      status: device.status,
      lastRegisteredAt: device.lastRegisteredAt,
      lastSeenAt: device.lastSeenAt,
      deactivatedAt: device.deactivatedAt,
      invalidatedAt: device.invalidatedAt,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }

  private tenantId(actor: AuthenticatedUser): string {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context is required for push devices');
    }
    return actor.tenantId;
  }

  private token(value: string): string {
    const token = value.trim();
    if (token.length < 20 || token.length > 4096 || /[\s\0]/.test(token)) {
      throw new BadRequestException('Push device token is invalid');
    }
    return token;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private mask(value: string): string {
    return `***${value.slice(-8)}`;
  }
}
