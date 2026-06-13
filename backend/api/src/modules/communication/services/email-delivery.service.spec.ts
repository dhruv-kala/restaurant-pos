import { ServiceUnavailableException } from '@nestjs/common';
import {
  CommunicationAttemptStatus,
  CommunicationChannel,
  CommunicationMessageStatus,
  CommunicationProviderStatus,
  CommunicationRecipientType,
  type Prisma,
} from '@prisma/client';

import type { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditService } from '../../audit/services/audit.service';
import { CommunicationProviderError } from '../providers/communication-provider.adapter';
import type { SmtpProviderAdapter } from '../providers/smtp-provider.adapter';
import type { CommunicationAddressProtector } from './communication-address-protector';
import { CommunicationDeliveryExecutor } from './communication-delivery-executor.service';
import { EmailDeliveryService } from './email-delivery.service';

const actor: AuthenticatedUser = {
  id: 'user-1',
  email: 'admin@example.test',
  name: 'Admin',
  tenantId: 'tenant-1',
  outletId: null,
  roles: ['TENANT_ADMIN'],
  permissions: ['communication.send'],
};

function setup(sendResult: Promise<unknown>) {
  const provider = {
    id: 'provider-1',
    tenantId: 'tenant-1',
    channel: CommunicationChannel.EMAIL,
    providerKey: 'smtp',
    displayName: 'SMTP',
    status: CommunicationProviderStatus.ACTIVE,
    priority: 1,
    secretReference: 'env:SMTP_PASSWORD',
    configMetadata: {},
    capabilities: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const message = {
    id: 'message-1',
    tenantId: 'tenant-1',
    outletId: null,
    notificationId: null,
    providerId: provider.id,
    templateId: null,
    templateVersionId: null,
    channel: CommunicationChannel.EMAIL,
    recipientType: CommunicationRecipientType.EXTERNAL,
    recipientUserId: null,
    recipientReferenceId: null,
    recipientAddressCiphertext: 'ciphertext',
    recipientAddressHash: 'a'.repeat(64),
    recipientAddressMasked: 'c***@example.test',
    subjectSnapshot: 'Subject',
    bodySnapshot: 'Body',
    locale: 'en',
    status: CommunicationMessageStatus.QUEUED,
    idempotencyKey: 'email:1',
    requestFingerprint: 'b'.repeat(64),
    metadata: null,
    scheduledAt: null,
    availableAt: new Date(0),
    processingStartedAt: null,
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    failedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    provider,
  };
  const attemptUpdate = jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({});
  const transaction = {
    $queryRaw: jest.fn(),
    communicationMessage: {
      findFirst: jest.fn().mockResolvedValue(message),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    communicationProvider: {
      findFirst: jest.fn(),
    },
    communicationAttempt: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
      update: attemptUpdate,
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(transaction as unknown as Prisma.TransactionClient),
    ),
  } as unknown as PrismaService;
  const auditAppend = jest.fn<Promise<unknown>, [unknown, unknown]>().mockResolvedValue({});
  const audit = { append: auditAppend } as unknown as AuditService;
  const addresses = {
    decrypt: jest.fn().mockReturnValue('customer@example.test'),
  } as unknown as CommunicationAddressProtector;
  const smtp = {
    providerKey: 'smtp',
    send: jest.fn().mockReturnValue(sendResult),
  } as unknown as SmtpProviderAdapter;
  const delivery = new CommunicationDeliveryExecutor(prisma, audit, addresses);
  return {
    service: new EmailDeliveryService(delivery, smtp),
    delivery,
    smtp,
    transaction,
    attemptUpdate,
    auditAppend,
  };
}

describe('EmailDeliveryService', () => {
  it('claims a queued email and records SMTP acceptance', async () => {
    const acceptedAt = new Date();
    const { service, attemptUpdate, auditAppend } = setup(
      Promise.resolve({
        providerMessageId: 'smtp-1',
        acceptedAt,
        metadata: { responseCode: 250 },
      }),
    );

    await expect(service.deliver('message-1', actor)).resolves.toMatchObject({
      messageId: 'message-1',
      attemptId: 'attempt-1',
      status: CommunicationMessageStatus.SENT,
    });
    const finalAttemptUpdate = attemptUpdate.mock.calls.at(-1)?.[0] as {
      data: Record<string, unknown>;
    };
    expect(finalAttemptUpdate.data).toMatchObject({
      status: CommunicationAttemptStatus.ACCEPTED,
      providerMessageId: 'smtp-1',
    });
    expect(auditAppend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'communication.email.sent' }),
    );
  });

  it('records a failed attempt without scheduling a retry', async () => {
    const { service, attemptUpdate, auditAppend } = setup(
      Promise.reject(new CommunicationProviderError('SMTP delivery failed', 'ETIMEDOUT', true)),
    );

    await expect(service.deliver('message-1', actor)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    const finalAttemptUpdate = attemptUpdate.mock.calls.at(-1)?.[0] as {
      data: Record<string, unknown>;
    };
    expect(finalAttemptUpdate.data).toMatchObject({
      status: CommunicationAttemptStatus.RETRYABLE_FAILED,
      errorCode: 'ETIMEDOUT',
    });
    expect(finalAttemptUpdate.data).not.toHaveProperty('nextRetryAt');
    expect(auditAppend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'communication.email.failed' }),
    );
  });

  it('does not misclassify persistence failure after SMTP acceptance', async () => {
    const { service, attemptUpdate, auditAppend } = setup(
      Promise.resolve({
        providerMessageId: 'smtp-1',
        acceptedAt: new Date(),
      }),
    );
    auditAppend.mockRejectedValueOnce(new Error('database finalization failed'));

    await expect(service.deliver('message-1', actor)).rejects.toThrow(
      'database finalization failed',
    );
    const statuses = attemptUpdate.mock.calls.map((call) => {
      const input = call[0] as { data?: { status?: unknown } };
      return input.data?.status;
    });
    expect(statuses).toEqual([
      CommunicationAttemptStatus.PROCESSING,
      CommunicationAttemptStatus.ACCEPTED,
    ]);
  });

  it('runs channel failure cleanup inside the finalization transaction', async () => {
    const failure = new CommunicationProviderError(
      'Invalid destination',
      'DESTINATION_INVALID',
      false,
      true,
    );
    const { delivery, smtp, transaction } = setup(Promise.reject(failure));
    const onFailure = jest.fn().mockResolvedValue(undefined);

    await expect(
      delivery.deliver('message-1', actor, {
        channel: CommunicationChannel.EMAIL,
        auditChannel: 'email',
        adapter: smtp,
        onFailure,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(onFailure).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        tenantId: 'tenant-1',
        messageId: 'message-1',
        recipientAddressHash: 'a'.repeat(64),
        error: failure,
      }),
    );
  });
});
