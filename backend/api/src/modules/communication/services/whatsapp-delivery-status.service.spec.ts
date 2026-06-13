import { CommunicationMessageStatus, type Prisma } from '@prisma/client';

import type { CommunicationDeliveryStatusService } from './communication-delivery-status.service';
import { WhatsAppDeliveryStatusService } from './whatsapp-delivery-status.service';

function setup(resultStatus: CommunicationMessageStatus) {
  const synchronize = jest.fn().mockResolvedValue({
    messageId: 'message-1',
    attemptId: 'attempt-1',
    messageStatus: resultStatus,
  });
  return {
    service: new WhatsAppDeliveryStatusService({
      synchronize,
    } as unknown as CommunicationDeliveryStatusService),
    transaction: {} as Prisma.TransactionClient,
    synchronize,
  };
}

describe('WhatsAppDeliveryStatusService', () => {
  it('delegates provider delivery to centralized status synchronization', async () => {
    const occurredAt = new Date();
    const { service, transaction, synchronize } = setup(
      CommunicationMessageStatus.DELIVERED,
    );

    await expect(
      service.record(transaction, {
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        providerMessageId: 'SM-provider-1',
        status: 'DELIVERED',
        occurredAt,
      }),
    ).resolves.toMatchObject({ status: CommunicationMessageStatus.DELIVERED });
    expect(synchronize).toHaveBeenCalledWith(transaction, {
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      webhook: {
        providerEventId: 'SM-provider-1:DELIVERED',
        providerMessageId: 'SM-provider-1',
        eventType: 'DELIVERED',
        occurredAt,
      },
    });
  });

  it('delegates read receipts', async () => {
    const occurredAt = new Date();
    const { service, transaction } = setup(CommunicationMessageStatus.READ);

    await expect(
      service.record(transaction, {
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        providerMessageId: 'SM-provider-1',
        status: 'READ',
        occurredAt,
      }),
    ).resolves.toMatchObject({
      messageId: 'message-1',
      attemptId: 'attempt-1',
      status: CommunicationMessageStatus.READ,
      occurredAt,
    });
  });
});
