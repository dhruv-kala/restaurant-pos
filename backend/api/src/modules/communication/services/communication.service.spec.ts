import { ConflictException } from '@nestjs/common';
import {
  CommunicationChannel,
  CommunicationMessageStatus,
  CommunicationRecipientType,
  type CommunicationMessage,
  type Prisma,
} from '@prisma/client';

import type { EnqueueCommunicationMessage } from '../models/communication-message.model';
import { CommunicationService } from './communication.service';

const input: EnqueueCommunicationMessage = {
  tenantId: '00000000-0000-7000-8000-000000000001',
  channel: CommunicationChannel.EMAIL,
  recipientType: CommunicationRecipientType.EXTERNAL,
  recipientAddressCiphertext: 'ciphertext',
  recipientAddressHash: 'a'.repeat(64),
  recipientAddressMasked: 'a***@example.test',
  bodySnapshot: 'Hello',
  idempotencyKey: 'event:1:email',
  metadata: { token: 'must-redact', safe: 'value' },
};

describe('CommunicationService', () => {
  it('redacts metadata and returns the same message for an identical request', async () => {
    const service = new CommunicationService();
    let stored: CommunicationMessage | null = null;
    let createData: Record<string, unknown> | undefined;
    const transaction = {
      communicationMessage: {
        findUnique: jest.fn(() => Promise.resolve(stored)),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          stored = {
            id: '00000000-0000-7000-8000-000000000002',
            ...data,
            outletId: null,
            notificationId: null,
            providerId: null,
            recipientUserId: null,
            recipientReferenceId: null,
            subjectSnapshot: null,
            scheduledAt: null,
            processingStartedAt: null,
            sentAt: null,
            deliveredAt: null,
            failedAt: null,
            cancelledAt: null,
            status: CommunicationMessageStatus.QUEUED,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CommunicationMessage;
          return Promise.resolve(stored);
        }),
      },
    };

    const first = await service.enqueue(transaction as unknown as Prisma.TransactionClient, input);
    const second = await service.enqueue(transaction as unknown as Prisma.TransactionClient, input);

    expect(second.id).toBe(first.id);
    expect(createData?.metadata).toEqual({ token: '[REDACTED]', safe: 'value' });
    expect(transaction.communicationMessage.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an idempotency key reused with different content', async () => {
    const service = new CommunicationService();
    const transaction = {
      communicationMessage: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            requestFingerprint: 'b'.repeat(64),
          }),
        ),
      },
    };

    await expect(
      service.enqueue(transaction as unknown as Prisma.TransactionClient, input),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
