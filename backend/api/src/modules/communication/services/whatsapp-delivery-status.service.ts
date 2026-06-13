import { Injectable } from '@nestjs/common';
import { CommunicationMessageStatus, Prisma } from '@prisma/client';

import { CommunicationDeliveryStatusService } from './communication-delivery-status.service';

export type WhatsAppDeliveryEventStatus = 'DELIVERED' | 'READ';

export interface RecordWhatsAppDeliveryStatus {
  tenantId: string;
  providerId: string;
  providerMessageId: string;
  status: WhatsAppDeliveryEventStatus;
  occurredAt: Date;
}

@Injectable()
export class WhatsAppDeliveryStatusService {
  constructor(private readonly deliveryStatus: CommunicationDeliveryStatusService) {}

  async record(
    transaction: Prisma.TransactionClient,
    input: RecordWhatsAppDeliveryStatus,
  ) {
    const result = await this.deliveryStatus.synchronize(transaction, {
      tenantId: input.tenantId,
      providerId: input.providerId,
      webhook: {
        providerEventId: `${input.providerMessageId}:${input.status}`,
        providerMessageId: input.providerMessageId,
        eventType: input.status,
        occurredAt: input.occurredAt,
      },
    });
    return {
      messageId: result.messageId,
      attemptId: result.attemptId,
      status:
        result.messageStatus ??
        (input.status === 'READ'
          ? CommunicationMessageStatus.READ
          : CommunicationMessageStatus.DELIVERED),
      occurredAt: input.occurredAt,
    };
  }
}
