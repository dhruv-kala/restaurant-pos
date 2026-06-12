import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipStatus,
  NotificationAudience,
  NotificationCategory,
  NotificationDeliveryStatus,
  Prisma,
} from '@prisma/client';

import {
  applyDatabaseRequestContext,
  hasRole,
  MANAGER_ROLE,
} from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type { CreateNotificationDto } from '../dto/create-notification.dto';
import type { NotificationQueryDto } from '../dto/notification-query.dto';
import type { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';
import {
  requireNotificationManage,
  requireNotificationPublish,
  resolveNotificationScope,
} from './notification-access.util';

const notificationInclude = {
  createdBy: { select: { id: true, displayName: true, email: true } },
  outlet: { select: { id: true, name: true } },
  _count: { select: { recipients: true } },
} satisfies Prisma.NotificationInclude;

const inboxInclude = {
  notification: {
    include: {
      outlet: { select: { id: true, name: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
  },
} satisfies Prisma.NotificationRecipientInclude;

const notificationDetailInclude = {
  ...notificationInclude,
  recipients: {
    select: {
      userId: true,
      deliveryStatus: true,
      deliveredAt: true,
      readAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.NotificationInclude;

type InboxRecord = Prisma.NotificationRecipientGetPayload<{
  include: typeof inboxInclude;
}>;
type AdminNotification = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;
type AdminNotificationDetail = Prisma.NotificationGetPayload<{
  include: typeof notificationDetailInclude;
}>;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateNotificationDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireNotificationPublish(actor);
    const scope = resolveNotificationScope(actor, dto.tenantId, dto.outletId);
    this.validateAudience(dto, actor, scope.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.validateScopeRecords(tx, scope.tenantId, scope.outletId);
      const userIds = await this.resolveRecipients(tx, dto, actor, scope.tenantId, scope.outletId);
      if (userIds.length === 0) {
        throw new BadRequestException('Notification audience has no active recipients');
      }
      const disabled = dto.isMandatory
        ? new Set<string>()
        : new Set(
            (
              await tx.notificationPreference.findMany({
                where: {
                  tenantId: scope.tenantId,
                  userId: { in: userIds },
                  category: dto.category,
                  inAppEnabled: false,
                },
                select: { userId: true },
              })
            ).map((item) => item.userId),
          );
      const now = new Date();
      const deliveredCount = userIds.filter((id) => !disabled.has(id)).length;
      const deliveryStatus =
        deliveredCount > 0
          ? NotificationDeliveryStatus.DELIVERED
          : NotificationDeliveryStatus.SKIPPED;
      const notification = await tx.notification.create({
        data: {
          tenantId: scope.tenantId,
          outletId: dto.audience === NotificationAudience.TENANT ? null : scope.outletId,
          audience: dto.audience,
          category: dto.category,
          priority: dto.priority,
          title: dto.title.trim(),
          body: dto.body.trim(),
          actionUrl: dto.actionUrl?.trim(),
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          isMandatory: dto.isMandatory,
          deliveryStatus,
          deliveredAt: deliveryStatus === NotificationDeliveryStatus.DELIVERED ? now : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          createdByUserId: actor.id,
          recipients: {
            create: userIds.map((userId) => ({
              tenantId: scope.tenantId,
              userId,
              deliveryStatus: disabled.has(userId)
                ? NotificationDeliveryStatus.SKIPPED
                : NotificationDeliveryStatus.DELIVERED,
              deliveredAt: disabled.has(userId) ? null : now,
            })),
          },
        },
        include: notificationInclude,
      });
      await this.audit.append(tx, {
        tenantId: scope.tenantId,
        outletId: notification.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'notifications.created',
        targetType: 'Notification',
        targetId: notification.id,
        metadata: {
          audience: notification.audience,
          category: notification.category,
          priority: notification.priority,
          recipientCount: userIds.length,
          deliveredCount,
          skippedCount: userIds.length - deliveredCount,
          mandatory: notification.isMandatory,
        },
        ...request,
      });
      return this.adminResponse(notification, {
        delivered: deliveredCount,
        skipped: userIds.length - deliveredCount,
      });
    });
  }

  async inbox(query: NotificationQueryDto, actor: AuthenticatedUser) {
    const tenantId = this.actorTenant(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const where: Prisma.NotificationRecipientWhereInput = {
        tenantId,
        userId: actor.id,
        deliveryStatus: NotificationDeliveryStatus.DELIVERED,
        archivedAt: null,
        ...(query.unreadOnly ? { readAt: null } : {}),
        notification: {
          ...(query.category ? { category: query.category } : {}),
          ...(query.priority ? { priority: query.priority } : {}),
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          ...(query.search?.trim()
            ? {
                AND: {
                  OR: [
                    { title: { contains: query.search.trim(), mode: 'insensitive' } },
                    { body: { contains: query.search.trim(), mode: 'insensitive' } },
                  ],
                },
              }
            : {}),
        },
      };
      const [records, total] = await Promise.all([
        tx.notificationRecipient.findMany({
          where,
          include: inboxInclude,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.notificationRecipient.count({ where }),
      ]);
      return {
        data: records.map((record) => this.inboxResponse(record)),
        meta: this.pageMeta(query, total),
      };
    });
  }

  async unreadCount(actor: AuthenticatedUser) {
    const tenantId = this.actorTenant(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const count = await tx.notificationRecipient.count({
        where: {
          tenantId,
          userId: actor.id,
          deliveryStatus: NotificationDeliveryStatus.DELIVERED,
          readAt: null,
          archivedAt: null,
          notification: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        },
      });
      return { unreadCount: count };
    });
  }

  async detail(id: string, actor: AuthenticatedUser) {
    const tenantId = this.actorTenant(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const record = await tx.notificationRecipient.findFirst({
        where: {
          tenantId,
          userId: actor.id,
          notificationId: id,
          deliveryStatus: NotificationDeliveryStatus.DELIVERED,
        },
        include: inboxInclude,
      });
      if (!record) throw new NotFoundException('Notification not found');
      return this.inboxResponse(record);
    });
  }

  async markRead(id: string, actor: AuthenticatedUser) {
    const tenantId = this.actorTenant(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const record = await tx.notificationRecipient.findFirst({
        where: {
          tenantId,
          userId: actor.id,
          notificationId: id,
          deliveryStatus: NotificationDeliveryStatus.DELIVERED,
        },
      });
      if (!record) throw new NotFoundException('Notification not found');
      if (!record.readAt) {
        await tx.notificationRecipient.update({
          where: { id: record.id },
          data: { readAt: new Date() },
        });
      }
      return { notificationId: id, read: true };
    });
  }

  async markAllRead(actor: AuthenticatedUser) {
    const tenantId = this.actorTenant(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const result = await tx.notificationRecipient.updateMany({
        where: {
          tenantId,
          userId: actor.id,
          deliveryStatus: NotificationDeliveryStatus.DELIVERED,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      return { updatedCount: result.count };
    });
  }

  async preferences(actor: AuthenticatedUser) {
    const tenantId = this.actorTenant(actor);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const saved = await tx.notificationPreference.findMany({
        where: { tenantId, userId: actor.id },
      });
      const byCategory = new Map(saved.map((item) => [item.category, item]));
      return Object.values(NotificationCategory).map((category) => ({
        category,
        inAppEnabled: byCategory.get(category)?.inAppEnabled ?? true,
      }));
    });
  }

  async updatePreferences(
    dto: UpdateNotificationPreferencesDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    const tenantId = this.actorTenant(actor);
    const unique = new Map(dto.preferences.map((item) => [item.category, item.inAppEnabled]));
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      for (const [category, inAppEnabled] of unique) {
        await tx.notificationPreference.upsert({
          where: {
            tenantId_userId_category: { tenantId, userId: actor.id, category },
          },
          update: { inAppEnabled },
          create: { tenantId, userId: actor.id, category, inAppEnabled },
        });
      }
      await this.audit.append(tx, {
        tenantId,
        outletId: actor.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'notifications.preferences.updated',
        targetType: 'NotificationPreference',
        targetId: actor.id,
        changes: Object.fromEntries(unique),
        ...request,
      });
      return this.preferencesInTransaction(tx, tenantId, actor.id);
    });
  }

  async adminList(query: NotificationQueryDto, actor: AuthenticatedUser) {
    requireNotificationManage(actor);
    const scope = resolveNotificationScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.NotificationWhereInput = {
        tenantId: scope.tenantId,
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.deliveryStatus ? { deliveryStatus: query.deliveryStatus } : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                { title: { contains: query.search.trim(), mode: 'insensitive' } },
                { body: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [records, total] = await Promise.all([
        tx.notification.findMany({
          where,
          include: notificationInclude,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.notification.count({ where }),
      ]);
      return {
        data: records.map((item) => this.adminResponse(item)),
        meta: this.pageMeta(query, total),
      };
    });
  }

  async adminDetail(id: string, query: NotificationQueryDto, actor: AuthenticatedUser) {
    requireNotificationManage(actor);
    const scope = resolveNotificationScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const notification = await tx.notification.findFirst({
        where: {
          id,
          tenantId: scope.tenantId,
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include: notificationDetailInclude,
      });
      if (!notification) throw new NotFoundException('Notification not found');
      return this.adminResponse(notification);
    });
  }

  private validateAudience(
    dto: CreateNotificationDto,
    actor: AuthenticatedUser,
    outletId?: string,
  ): void {
    if (dto.title.trim().length === 0 || dto.body.trim().length === 0) {
      throw new BadRequestException('Notification title and body are required');
    }
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException('expiresAt must be in the future');
    }
    if (dto.audience === NotificationAudience.USER && !dto.userIds?.length) {
      throw new BadRequestException('userIds are required for USER notifications');
    }
    if (dto.audience !== NotificationAudience.USER && dto.userIds?.length) {
      throw new BadRequestException('userIds are valid only for USER notifications');
    }
    if (dto.audience === NotificationAudience.OUTLET && !outletId) {
      throw new BadRequestException('outletId is required for OUTLET notifications');
    }
    if (dto.audience !== NotificationAudience.OUTLET && dto.outletId) {
      throw new BadRequestException('outletId is valid only for OUTLET notifications');
    }
    if (hasRole(actor, MANAGER_ROLE) && dto.audience === NotificationAudience.TENANT) {
      throw new ForbiddenException('Managers cannot publish tenant-wide notifications');
    }
  }

  private async validateScopeRecords(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId?: string,
  ): Promise<void> {
    if (!outletId) return;
    const outlet = await tx.outlet.findFirst({
      where: { id: outletId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
  }

  private async resolveRecipients(
    tx: Prisma.TransactionClient,
    dto: CreateNotificationDto,
    actor: AuthenticatedUser,
    tenantId: string,
    outletId?: string,
  ): Promise<string[]> {
    const memberships = await tx.tenantMembership.findMany({
      where: {
        tenantId,
        status: MembershipStatus.ACTIVE,
        revokedAt: null,
        ...(dto.audience === NotificationAudience.USER
          ? { userId: { in: [...new Set(dto.userIds)] } }
          : {}),
        ...(dto.audience === NotificationAudience.USER && hasRole(actor, MANAGER_ROLE)
          ? { outletAssignments: { some: { outletId } } }
          : {}),
        ...(dto.audience === NotificationAudience.OUTLET
          ? { outletAssignments: { some: { outletId } } }
          : {}),
      },
      select: { userId: true },
    });
    const userIds = memberships.map((membership) => membership.userId);
    if (
      dto.audience === NotificationAudience.USER &&
      userIds.length !== new Set(dto.userIds).size
    ) {
      throw new BadRequestException('One or more users are not active tenant members');
    }
    return userIds;
  }

  private actorTenant(actor: AuthenticatedUser): string {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant user context is required for notification inbox');
    }
    return actor.tenantId;
  }

  private async preferencesInTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ) {
    const saved = await tx.notificationPreference.findMany({ where: { tenantId, userId } });
    const byCategory = new Map(saved.map((item) => [item.category, item]));
    return Object.values(NotificationCategory).map((category) => ({
      category,
      inAppEnabled: byCategory.get(category)?.inAppEnabled ?? true,
    }));
  }

  private pageMeta(query: NotificationQueryDto, total: number) {
    return {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private inboxResponse(record: InboxRecord): Record<string, unknown> {
    const notification = record.notification;
    return {
      id: notification.id,
      recipientId: record.id,
      tenantId: notification.tenantId,
      outlet: notification.outlet,
      audience: notification.audience,
      category: notification.category,
      priority: notification.priority,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
      isMandatory: notification.isMandatory,
      deliveredAt: record.deliveredAt,
      readAt: record.readAt,
      createdAt: notification.createdAt,
      createdBy: notification.createdBy,
    };
  }

  private adminResponse(
    notification: AdminNotification | AdminNotificationDetail,
    delivery?: { delivered: number; skipped: number },
  ): Record<string, unknown> {
    const recipients = 'recipients' in notification ? notification.recipients : undefined;
    return {
      ...notification,
      recipientCount: notification._count.recipients,
      deliverySummary:
        delivery ??
        (recipients
          ? {
              delivered: recipients.filter(
                (item) => item.deliveryStatus === NotificationDeliveryStatus.DELIVERED,
              ).length,
              skipped: recipients.filter(
                (item) => item.deliveryStatus === NotificationDeliveryStatus.SKIPPED,
              ).length,
              read: recipients.filter((item) => item.readAt).length,
            }
          : undefined),
    };
  }
}
