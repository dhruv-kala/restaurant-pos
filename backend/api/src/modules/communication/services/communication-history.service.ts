import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type {
  CommunicationMessageQueryDto,
  CommunicationMessageScopeDto,
} from '../dto/communication-message-query.dto';
import {
  requireCommunicationHistoryView,
  resolveCommunicationScope,
} from './communication-access.util';

const messageInclude = {
  provider: { select: { id: true, providerKey: true, displayName: true } },
  template: { select: { id: true, templateKey: true, name: true } },
  templateVersion: { select: { id: true, versionNumber: true } },
  attempts: {
    select: {
      id: true,
      providerId: true,
      attemptNumber: true,
      status: true,
      providerMessageId: true,
      errorCode: true,
      errorClassification: true,
      startedAt: true,
      completedAt: true,
      nextRetryAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { attemptNumber: 'desc' as const },
  },
} satisfies Prisma.CommunicationMessageInclude;

type MessageRecord = Prisma.CommunicationMessageGetPayload<{
  include: typeof messageInclude;
}>;

@Injectable()
export class CommunicationHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CommunicationMessageQueryDto, actor: AuthenticatedUser) {
    requireCommunicationHistoryView(actor);
    const scope = resolveCommunicationScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.CommunicationMessageWhereInput = {
        tenantId: scope.tenantId,
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                {
                  recipientAddressMasked: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  idempotencyKey: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  subjectSnapshot: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      };
      const [records, total] = await Promise.all([
        tx.communicationMessage.findMany({
          where,
          include: messageInclude,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.communicationMessage.count({ where }),
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

  async detail(id: string, query: CommunicationMessageScopeDto, actor: AuthenticatedUser) {
    requireCommunicationHistoryView(actor);
    const scope = resolveCommunicationScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const record = await tx.communicationMessage.findFirst({
        where: {
          id,
          tenantId: scope.tenantId,
          ...(scope.outletId ? { outletId: scope.outletId } : {}),
        },
        include: messageInclude,
      });
      if (!record) throw new NotFoundException('Communication message not found');
      return this.response(record);
    });
  }

  async attempts(id: string, query: CommunicationMessageScopeDto, actor: AuthenticatedUser) {
    const detail = await this.detail(id, query, actor);
    return {
      messageId: detail.id,
      attempts: detail.attempts,
    };
  }

  private response(record: MessageRecord) {
    return {
      id: record.id,
      tenantId: record.tenantId,
      outletId: record.outletId,
      notificationId: record.notificationId,
      channel: record.channel,
      recipientType: record.recipientType,
      recipientUserId: record.recipientUserId,
      recipientReferenceId: record.recipientReferenceId,
      recipientAddressMasked: record.recipientAddressMasked,
      subjectSnapshot: record.subjectSnapshot,
      bodySnapshot: record.bodySnapshot,
      locale: record.locale,
      status: record.status,
      idempotencyKey: record.idempotencyKey,
      metadata: record.metadata,
      scheduledAt: record.scheduledAt,
      availableAt: record.availableAt,
      processingStartedAt: record.processingStartedAt,
      sentAt: record.sentAt,
      deliveredAt: record.deliveredAt,
      readAt: record.readAt,
      failedAt: record.failedAt,
      cancelledAt: record.cancelledAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      provider: record.provider,
      template: record.template,
      templateVersion: record.templateVersion,
      attempts: record.attempts,
    };
  }
}
