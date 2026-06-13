import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunicationAttemptStatus,
  CommunicationChannel,
  CommunicationMessageStatus,
  Prisma,
} from '@prisma/client';

import { AuditService } from '../../audit/services/audit.service';

export type WhatsAppDeliveryEventStatus = 'DELIVERED' | 'READ';

export interface RecordWhatsAppDeliveryStatus {
  tenantId: string;
  providerMessageId: string;
  status: WhatsAppDeliveryEventStatus;
  occurredAt: Date;
}

@Injectable()
export class WhatsAppDeliveryStatusService {
  constructor(private readonly audit: AuditService) {}

  async record(
    transaction: Prisma.TransactionClient,
    input: RecordWhatsAppDeliveryStatus,
  ) {
    const attempt = await transaction.communicationAttempt.findFirst({
      where: {
        tenantId: input.tenantId,
        providerMessageId: input.providerMessageId,
        message: { channel: CommunicationChannel.WHATSAPP },
      },
      include: {
        message: {
          select: {
            id: true,
            tenantId: true,
            outletId: true,
            status: true,
            deliveredAt: true,
            readAt: true,
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('WhatsApp delivery attempt not found');
    if (
      attempt.status !== CommunicationAttemptStatus.ACCEPTED &&
      attempt.status !== CommunicationAttemptStatus.DELIVERED
    ) {
      throw new ConflictException('WhatsApp delivery attempt cannot receive provider status');
    }
    if (
      attempt.message.status !== CommunicationMessageStatus.SENT &&
      attempt.message.status !== CommunicationMessageStatus.DELIVERED &&
      attempt.message.status !== CommunicationMessageStatus.READ
    ) {
      throw new ConflictException('WhatsApp message cannot receive provider status');
    }

    const targetStatus =
      input.status === 'READ'
        ? CommunicationMessageStatus.READ
        : CommunicationMessageStatus.DELIVERED;
    const alreadyApplied =
      attempt.message.status === CommunicationMessageStatus.READ ||
      attempt.message.status === targetStatus;
    if (alreadyApplied) {
      return {
        messageId: attempt.message.id,
        attemptId: attempt.id,
        status: attempt.message.status,
        occurredAt:
          attempt.message.readAt ?? attempt.message.deliveredAt ?? input.occurredAt,
      };
    }

    if (attempt.status !== CommunicationAttemptStatus.DELIVERED) {
      await transaction.communicationAttempt.update({
        where: {
          tenantId_id: { tenantId: input.tenantId, id: attempt.id },
        },
        data: { status: CommunicationAttemptStatus.DELIVERED },
      });
    }
    await transaction.communicationMessage.update({
      where: {
        tenantId_id: { tenantId: input.tenantId, id: attempt.message.id },
      },
      data: {
        status: targetStatus,
        deliveredAt: attempt.message.deliveredAt ?? input.occurredAt,
        ...(targetStatus === CommunicationMessageStatus.READ
          ? { readAt: input.occurredAt }
          : {}),
      },
    });
    await this.audit.append(transaction, {
      tenantId: input.tenantId,
      outletId: attempt.message.outletId,
      action: `communication.whatsapp.${input.status.toLowerCase()}`,
      targetType: 'CommunicationMessage',
      targetId: attempt.message.id,
      metadata: {
        attemptId: attempt.id,
        providerId: attempt.providerId,
        providerMessageId: input.providerMessageId,
      },
    });
    return {
      messageId: attempt.message.id,
      attemptId: attempt.id,
      status: targetStatus,
      occurredAt: input.occurredAt,
    };
  }
}
