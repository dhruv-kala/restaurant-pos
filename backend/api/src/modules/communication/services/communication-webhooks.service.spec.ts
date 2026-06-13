import {
  CommunicationChannel,
  CommunicationProviderStatus,
  CommunicationWebhookProcessingStatus,
  type CommunicationProvider,
  type Prisma,
} from '@prisma/client';

import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuditService } from '../../audit/services/audit.service';
import type { CommunicationWebhookVerifier } from '../providers/communication-webhook.verifier';
import type { CommunicationDeliveryStatusService } from './communication-delivery-status.service';
import type { CommunicationWebhookNormalizer } from './communication-webhook-normalizer';
import { CommunicationWebhooksService } from './communication-webhooks.service';

const provider: CommunicationProvider = {
  id: 'provider-1',
  tenantId: 'tenant-1',
  channel: CommunicationChannel.SMS,
  providerKey: 'twilio',
  displayName: 'Twilio',
  status: CommunicationProviderStatus.ACTIVE,
  priority: 1,
  secretReference: 'env:TWILIO_AUTH_TOKEN',
  configMetadata: {},
  capabilities: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup(existingWebhook?: {
  id: string;
  processingStatus: CommunicationWebhookProcessingStatus;
}) {
  const transaction = {
    $queryRaw: jest.fn(),
    communicationProvider: {
      findUnique: jest.fn().mockResolvedValue(provider),
    },
    communicationWebhook: {
      findUnique: jest.fn().mockResolvedValue(existingWebhook ?? null),
      create: jest.fn().mockResolvedValue({
        id: 'webhook-1',
        processingStatus: CommunicationWebhookProcessingStatus.PROCESSED,
      }),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(transaction as unknown as Prisma.TransactionClient),
    ),
  } as unknown as PrismaService;
  const verify = jest.fn();
  const verifier = { verify } as unknown as CommunicationWebhookVerifier;
  const normalize = jest.fn().mockReturnValue({
    providerEventId: 'event-1',
    providerMessageId: 'provider-message-1',
    eventType: 'DELIVERED',
    occurredAt: new Date(),
  });
  const normalizer = { normalize } as unknown as CommunicationWebhookNormalizer;
  const synchronize = jest.fn().mockResolvedValue({
    processingStatus: CommunicationWebhookProcessingStatus.PROCESSED,
    messageId: 'message-1',
    attemptId: 'attempt-1',
  });
  const deliveryStatus = { synchronize } as unknown as CommunicationDeliveryStatusService;
  const append = jest.fn().mockResolvedValue({});
  const audit = { append } as unknown as AuditService;
  return {
    service: new CommunicationWebhooksService(
      prisma,
      audit,
      verifier,
      normalizer,
      deliveryStatus,
    ),
    transaction,
    verify,
    synchronize,
    append,
  };
}

describe('CommunicationWebhooksService', () => {
  const request = {
    rawBody: Buffer.from('MessageSid=provider-message-1'),
    body: { MessageSid: 'provider-message-1' },
    headers: {},
  };

  it('persists and synchronizes a verified webhook once', async () => {
    const { service, transaction, verify, synchronize, append } = setup();

    await expect(service.ingest('twilio', 'provider-1', request)).resolves.toEqual({
      accepted: true,
      duplicate: false,
      webhookId: 'webhook-1',
      processingStatus: CommunicationWebhookProcessingStatus.PROCESSED,
    });
    expect(verify).toHaveBeenCalledWith(provider, request);
    expect(synchronize).toHaveBeenCalledTimes(1);
    expect(transaction.communicationWebhook.create).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'communication.webhook.processed' }),
    );
  });

  it('returns an existing event without repeating state synchronization', async () => {
    const { service, synchronize, transaction } = setup({
      id: 'webhook-existing',
      processingStatus: CommunicationWebhookProcessingStatus.PROCESSED,
    });

    await expect(service.ingest('twilio', 'provider-1', request)).resolves.toEqual({
      accepted: true,
      duplicate: true,
      webhookId: 'webhook-existing',
      processingStatus: CommunicationWebhookProcessingStatus.PROCESSED,
    });
    expect(synchronize).not.toHaveBeenCalled();
    expect(transaction.communicationWebhook.create).not.toHaveBeenCalled();
  });

  it('audits and rejects invalid signatures before normalization', async () => {
    const { service, verify, synchronize, append } = setup();
    verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(service.ingest('twilio', 'provider-1', request)).rejects.toThrow(
      'Webhook signature is invalid',
    );
    expect(synchronize).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'communication.webhook.verification_failed',
      }),
    );
  });
});
