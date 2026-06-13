import {
  CommunicationAttemptStatus,
  CommunicationChannel,
  CommunicationMessageStatus,
  CommunicationWebhookProcessingStatus,
  type Prisma,
} from '@prisma/client';

import type { AuditService } from '../../audit/services/audit.service';
import { CommunicationDeliveryStatusService } from './communication-delivery-status.service';

function setup(
  channel: CommunicationChannel,
  messageStatus: CommunicationMessageStatus = CommunicationMessageStatus.SENT,
  attemptStatus: CommunicationAttemptStatus = CommunicationAttemptStatus.ACCEPTED,
) {
  const attemptUpdate = jest
    .fn<Promise<object>, [{ data: Record<string, unknown>; where: Record<string, unknown> }]>()
    .mockResolvedValue({});
  const messageUpdate = jest
    .fn<Promise<object>, [{ data: Record<string, unknown>; where: Record<string, unknown> }]>()
    .mockResolvedValue({});
  const attempt = {
    id: 'attempt-1',
    tenantId: 'tenant-1',
    messageId: 'message-1',
    providerId: 'provider-1',
    attemptNumber: 1,
    status: attemptStatus,
    providerMessageId: 'provider-message-1',
    errorCode: null,
    errorClassification: null,
    requestMetadata: null,
    responseMetadata: null,
    startedAt: new Date(),
    completedAt: new Date(),
    nextRetryAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    message: {
      id: 'message-1',
      outletId: 'outlet-1',
      channel,
      status: messageStatus,
      sentAt: new Date(),
      deliveredAt:
        messageStatus === CommunicationMessageStatus.DELIVERED ||
        messageStatus === CommunicationMessageStatus.READ
          ? new Date(1000)
          : null,
      readAt: messageStatus === CommunicationMessageStatus.READ ? new Date(2000) : null,
    },
  };
  const transaction = {
    communicationAttempt: {
      findUnique: jest.fn().mockResolvedValue(attempt),
      update: attemptUpdate,
    },
    communicationMessage: { update: messageUpdate },
  } as unknown as Prisma.TransactionClient;
  const append = jest.fn().mockResolvedValue({});
  const service = new CommunicationDeliveryStatusService({
    append,
  } as unknown as AuditService);
  return { service, transaction, attemptUpdate, messageUpdate, append };
}

describe('CommunicationDeliveryStatusService', () => {
  it('promotes accepted SMS delivery to delivered', async () => {
    const occurredAt = new Date();
    const { service, transaction, attemptUpdate, messageUpdate } = setup(
      CommunicationChannel.SMS,
    );

    await expect(
      service.synchronize(transaction, {
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        webhook: {
          providerEventId: 'event-1',
          providerMessageId: 'provider-message-1',
          eventType: 'DELIVERED',
          occurredAt,
        },
      }),
    ).resolves.toMatchObject({
      processingStatus: CommunicationWebhookProcessingStatus.PROCESSED,
      messageStatus: CommunicationMessageStatus.DELIVERED,
    });
    expect(attemptUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: CommunicationAttemptStatus.DELIVERED } }),
    );
    expect(messageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: CommunicationMessageStatus.DELIVERED,
          deliveredAt: occurredAt,
        },
      }),
    );
  });

  it('supports direct WhatsApp read and email complaint failure events', async () => {
    const read = setup(CommunicationChannel.WHATSAPP);
    await expect(
      read.service.synchronize(read.transaction, {
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        webhook: {
          providerEventId: 'event-read',
          providerMessageId: 'provider-message-1',
          eventType: 'READ',
          occurredAt: new Date(),
        },
      }),
    ).resolves.toMatchObject({ messageStatus: CommunicationMessageStatus.READ });

    const complaint = setup(CommunicationChannel.EMAIL);
    await expect(
      complaint.service.synchronize(complaint.transaction, {
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        webhook: {
          providerEventId: 'event-complaint',
          providerMessageId: 'provider-message-1',
          eventType: 'COMPLAINT',
          occurredAt: new Date(),
        },
      }),
    ).resolves.toMatchObject({ messageStatus: CommunicationMessageStatus.FAILED });
    const failedAttempt = complaint.attemptUpdate.mock.calls.at(-1)?.[0] as unknown as {
      data: {
        status: CommunicationAttemptStatus;
        errorClassification: string;
      };
    };
    expect(failedAttempt.data).toMatchObject({
      status: CommunicationAttemptStatus.TERMINAL_FAILED,
      errorClassification: 'COMPLAINT',
    });
  });

  it('persists but ignores out-of-order failures after terminal success', async () => {
    const { service, transaction, attemptUpdate, messageUpdate } = setup(
      CommunicationChannel.SMS,
      CommunicationMessageStatus.DELIVERED,
      CommunicationAttemptStatus.DELIVERED,
    );

    await expect(
      service.synchronize(transaction, {
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        webhook: {
          providerEventId: 'event-late-failure',
          providerMessageId: 'provider-message-1',
          eventType: 'FAILED',
          occurredAt: new Date(),
        },
      }),
    ).resolves.toMatchObject({
      processingStatus: CommunicationWebhookProcessingStatus.IGNORED,
      reason: 'TERMINAL_SUCCESS_NOT_REGRESSED',
    });
    expect(attemptUpdate).not.toHaveBeenCalled();
    expect(messageUpdate).not.toHaveBeenCalled();
  });
});
