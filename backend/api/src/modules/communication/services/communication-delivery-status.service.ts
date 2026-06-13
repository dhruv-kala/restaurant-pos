import { Injectable } from '@nestjs/common';
import {
  CommunicationAttemptStatus,
  CommunicationChannel,
  CommunicationMessageStatus,
  CommunicationWebhookProcessingStatus,
  Prisma,
} from '@prisma/client';

import { AuditService } from '../../audit/services/audit.service';
import type {
  CommunicationDeliveryEventType,
  NormalizedCommunicationWebhook,
} from './communication-webhook-normalizer';

const attemptInclude = {
  message: {
    select: {
      id: true,
      outletId: true,
      channel: true,
      status: true,
      sentAt: true,
      deliveredAt: true,
      readAt: true,
    },
  },
} satisfies Prisma.CommunicationAttemptInclude;

type AttemptRecord = Prisma.CommunicationAttemptGetPayload<{
  include: typeof attemptInclude;
}>;

export interface CommunicationDeliveryStatusResult {
  processingStatus: CommunicationWebhookProcessingStatus;
  messageId?: string;
  attemptId?: string;
  messageStatus?: CommunicationMessageStatus;
  reason?: string;
}

@Injectable()
export class CommunicationDeliveryStatusService {
  constructor(private readonly audit: AuditService) {}

  async synchronize(
    transaction: Prisma.TransactionClient,
    input: {
      tenantId: string;
      providerId: string;
      webhook: NormalizedCommunicationWebhook;
    },
  ): Promise<CommunicationDeliveryStatusResult> {
    const attempt: AttemptRecord | null = await transaction.communicationAttempt.findUnique({
      where: {
        tenantId_providerId_providerMessageId: {
          tenantId: input.tenantId,
          providerId: input.providerId,
          providerMessageId: input.webhook.providerMessageId,
        },
      },
      include: attemptInclude,
    });
    if (!attempt) {
      return {
        processingStatus: CommunicationWebhookProcessingStatus.IGNORED,
        reason: 'ATTEMPT_NOT_FOUND',
      };
    }
    if (!this.supports(attempt.message.channel, input.webhook.eventType)) {
      return this.ignored(attempt, 'EVENT_NOT_SUPPORTED_FOR_CHANNEL');
    }

    if (input.webhook.eventType === 'DELIVERED') {
      return this.delivered(transaction, attempt, input);
    }
    if (input.webhook.eventType === 'READ') {
      return this.read(transaction, attempt, input);
    }
    if (['FAILED', 'BOUNCED', 'COMPLAINT'].includes(input.webhook.eventType)) {
      return this.failed(transaction, attempt, input);
    }
    return this.ignored(attempt, 'NON_TERMINAL_PROVIDER_STATUS');
  }

  private async delivered(
    transaction: Prisma.TransactionClient,
    attempt: AttemptRecord,
    input: StatusInput,
  ): Promise<CommunicationDeliveryStatusResult> {
    if (
      attempt.message.status === CommunicationMessageStatus.DELIVERED ||
      attempt.message.status === CommunicationMessageStatus.READ
    ) {
      return this.ignored(attempt, 'STATUS_ALREADY_APPLIED');
    }
    if (
      attempt.status !== CommunicationAttemptStatus.ACCEPTED ||
      attempt.message.status !== CommunicationMessageStatus.SENT
    ) {
      return this.ignored(attempt, 'STATUS_TRANSITION_NOT_ALLOWED');
    }
    await transaction.communicationAttempt.update({
      where: { tenantId_id: { tenantId: input.tenantId, id: attempt.id } },
      data: { status: CommunicationAttemptStatus.DELIVERED },
    });
    await transaction.communicationMessage.update({
      where: { tenantId_id: { tenantId: input.tenantId, id: attempt.message.id } },
      data: {
        status: CommunicationMessageStatus.DELIVERED,
        deliveredAt: input.webhook.occurredAt,
      },
    });
    await this.auditStatus(transaction, attempt, input.webhook, 'delivered');
    return this.processed(attempt, CommunicationMessageStatus.DELIVERED);
  }

  private async read(
    transaction: Prisma.TransactionClient,
    attempt: AttemptRecord,
    input: StatusInput,
  ): Promise<CommunicationDeliveryStatusResult> {
    if (attempt.message.status === CommunicationMessageStatus.READ) {
      return this.ignored(attempt, 'STATUS_ALREADY_APPLIED');
    }
    if (
      (attempt.status !== CommunicationAttemptStatus.ACCEPTED &&
        attempt.status !== CommunicationAttemptStatus.DELIVERED) ||
      (attempt.message.status !== CommunicationMessageStatus.SENT &&
        attempt.message.status !== CommunicationMessageStatus.DELIVERED)
    ) {
      return this.ignored(attempt, 'STATUS_TRANSITION_NOT_ALLOWED');
    }
    if (attempt.status === CommunicationAttemptStatus.ACCEPTED) {
      await transaction.communicationAttempt.update({
        where: { tenantId_id: { tenantId: input.tenantId, id: attempt.id } },
        data: { status: CommunicationAttemptStatus.DELIVERED },
      });
    }
    await transaction.communicationMessage.update({
      where: { tenantId_id: { tenantId: input.tenantId, id: attempt.message.id } },
      data: {
        status: CommunicationMessageStatus.READ,
        deliveredAt: attempt.message.deliveredAt ?? input.webhook.occurredAt,
        readAt: input.webhook.occurredAt,
      },
    });
    await this.auditStatus(transaction, attempt, input.webhook, 'read');
    return this.processed(attempt, CommunicationMessageStatus.READ);
  }

  private async failed(
    transaction: Prisma.TransactionClient,
    attempt: AttemptRecord,
    input: StatusInput,
  ): Promise<CommunicationDeliveryStatusResult> {
    if (
      attempt.message.status === CommunicationMessageStatus.DELIVERED ||
      attempt.message.status === CommunicationMessageStatus.READ
    ) {
      return this.ignored(attempt, 'TERMINAL_SUCCESS_NOT_REGRESSED');
    }
    if (
      attempt.status !== CommunicationAttemptStatus.ACCEPTED ||
      attempt.message.status !== CommunicationMessageStatus.SENT
    ) {
      return this.ignored(attempt, 'STATUS_TRANSITION_NOT_ALLOWED');
    }
    const errorCode = input.webhook.errorCode ?? input.webhook.eventType;
    await transaction.communicationAttempt.update({
      where: { tenantId_id: { tenantId: input.tenantId, id: attempt.id } },
      data: {
        status: CommunicationAttemptStatus.TERMINAL_FAILED,
        errorCode,
        errorClassification: input.webhook.eventType,
      },
    });
    await transaction.communicationMessage.update({
      where: { tenantId_id: { tenantId: input.tenantId, id: attempt.message.id } },
      data: {
        status: CommunicationMessageStatus.FAILED,
        failedAt: input.webhook.occurredAt,
      },
    });
    await this.auditStatus(
      transaction,
      attempt,
      input.webhook,
      input.webhook.eventType.toLowerCase(),
    );
    return this.processed(attempt, CommunicationMessageStatus.FAILED);
  }

  private supports(
    channel: CommunicationChannel,
    eventType: CommunicationDeliveryEventType,
  ): boolean {
    if (eventType === 'READ') return channel === CommunicationChannel.WHATSAPP;
    if (eventType === 'BOUNCED' || eventType === 'COMPLAINT') {
      return channel === CommunicationChannel.EMAIL;
    }
    return ['DELIVERED', 'FAILED', 'IGNORED'].includes(eventType);
  }

  private processed(
    attempt: AttemptRecord,
    messageStatus: CommunicationMessageStatus,
  ): CommunicationDeliveryStatusResult {
    return {
      processingStatus: CommunicationWebhookProcessingStatus.PROCESSED,
      messageId: attempt.message.id,
      attemptId: attempt.id,
      messageStatus,
    };
  }

  private ignored(attempt: AttemptRecord, reason: string): CommunicationDeliveryStatusResult {
    return {
      processingStatus: CommunicationWebhookProcessingStatus.IGNORED,
      messageId: attempt.message.id,
      attemptId: attempt.id,
      messageStatus: attempt.message.status,
      reason,
    };
  }

  private async auditStatus(
    transaction: Prisma.TransactionClient,
    attempt: AttemptRecord,
    webhook: NormalizedCommunicationWebhook,
    action: string,
  ): Promise<void> {
    await this.audit.append(transaction, {
      tenantId: attempt.tenantId,
      outletId: attempt.message.outletId,
      action: `communication.${attempt.message.channel.toLowerCase()}.${action}`,
      targetType: 'CommunicationMessage',
      targetId: attempt.message.id,
      reason: webhook.errorCode,
      metadata: {
        attemptId: attempt.id,
        providerId: attempt.providerId,
        providerMessageId: webhook.providerMessageId,
        source: 'WEBHOOK',
      },
    });
  }
}

interface StatusInput {
  tenantId: string;
  providerId: string;
  webhook: NormalizedCommunicationWebhook;
}
