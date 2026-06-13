import {
  CommunicationAttemptStatus,
  CommunicationMessageStatus,
  type Prisma,
} from '@prisma/client';

import type { AuditService } from '../../audit/services/audit.service';
import { WhatsAppDeliveryStatusService } from './whatsapp-delivery-status.service';

function setup(messageStatus: CommunicationMessageStatus) {
  const attemptUpdate = jest.fn().mockResolvedValue({});
  const messageUpdate = jest.fn().mockResolvedValue({});
  const transaction = {
    communicationAttempt: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'attempt-1',
        providerId: 'provider-1',
        status: CommunicationAttemptStatus.ACCEPTED,
        message: {
          id: 'message-1',
          tenantId: 'tenant-1',
          outletId: 'outlet-1',
          status: messageStatus,
          deliveredAt:
            messageStatus === CommunicationMessageStatus.DELIVERED ? new Date(1000) : null,
          readAt: null,
        },
      }),
      update: attemptUpdate,
    },
    communicationMessage: {
      update: messageUpdate,
    },
  };
  const append = jest.fn().mockResolvedValue({});
  const audit = { append } as unknown as AuditService;
  return {
    service: new WhatsAppDeliveryStatusService(audit),
    transaction: transaction as unknown as Prisma.TransactionClient,
    attemptUpdate,
    messageUpdate,
    append,
  };
}

describe('WhatsAppDeliveryStatusService', () => {
  it('records provider delivery without changing message snapshots', async () => {
    const occurredAt = new Date();
    const { service, transaction, attemptUpdate, messageUpdate, append } = setup(
      CommunicationMessageStatus.SENT,
    );

    await expect(
      service.record(transaction, {
        tenantId: 'tenant-1',
        providerMessageId: 'SM-provider-1',
        status: 'DELIVERED',
        occurredAt,
      }),
    ).resolves.toMatchObject({ status: CommunicationMessageStatus.DELIVERED });
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
    expect(append).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ action: 'communication.whatsapp.delivered' }),
    );
  });

  it('records a read receipt with delivered and read timestamps', async () => {
    const occurredAt = new Date();
    const { service, transaction, messageUpdate, append } = setup(
      CommunicationMessageStatus.DELIVERED,
    );

    await expect(
      service.record(transaction, {
        tenantId: 'tenant-1',
        providerMessageId: 'SM-provider-1',
        status: 'READ',
        occurredAt,
      }),
    ).resolves.toMatchObject({ status: CommunicationMessageStatus.READ });
    expect(messageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: CommunicationMessageStatus.READ,
          deliveredAt: new Date(1000),
          readAt: occurredAt,
        },
      }),
    );
    expect(append).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ action: 'communication.whatsapp.read' }),
    );
  });
});
