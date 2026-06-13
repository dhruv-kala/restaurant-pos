import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AuditResult,
  CommunicationAttemptStatus,
  CommunicationChannel,
  CommunicationMessageStatus,
  CommunicationProviderStatus,
  Prisma,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import {
  CommunicationProviderError,
  type CommunicationProviderRequest,
} from '../providers/communication-provider.adapter';
import { SmtpProviderAdapter } from '../providers/smtp-provider.adapter';
import { requireCommunicationSend, resolveCommunicationScope } from './communication-access.util';
import { CommunicationAddressProtector } from './communication-address-protector';
import { sanitizeCommunicationMetadata } from './communication-metadata.util';

const claimedMessageInclude = {
  provider: true,
} satisfies Prisma.CommunicationMessageInclude;

type ClaimedMessage = Prisma.CommunicationMessageGetPayload<{
  include: typeof claimedMessageInclude;
}>;

interface ClaimedDelivery {
  message: ClaimedMessage;
  attemptId: string;
  attemptNumber: number;
}

@Injectable()
export class EmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly addresses: CommunicationAddressProtector,
    private readonly smtp: SmtpProviderAdapter,
  ) {}

  async deliver(
    messageId: string,
    actor: AuthenticatedUser,
    requestedTenantId?: string,
    request: AuditRequestMetadata = {},
  ) {
    requireCommunicationSend(actor);
    const scope = resolveCommunicationScope(actor, requestedTenantId);
    const claimed = await this.claim(messageId, actor, scope.tenantId);

    let result: Awaited<ReturnType<SmtpProviderAdapter['send']>>;
    try {
      const destination = this.addresses.decrypt(claimed.message.recipientAddressCiphertext);
      const provider = claimed.message.provider;
      if (!provider) {
        throw new CommunicationProviderError(
          'Email provider is unavailable',
          'EMAIL_PROVIDER_UNAVAILABLE',
          false,
        );
      }
      const providerRequest: CommunicationProviderRequest = {
        messageId: claimed.message.id,
        tenantId: claimed.message.tenantId,
        providerId: provider.id,
        providerKey: provider.providerKey,
        configuration: provider.configMetadata,
        secretReference: provider.secretReference,
        channel: claimed.message.channel,
        destination,
        subject: claimed.message.subjectSnapshot,
        body: claimed.message.bodySnapshot,
        idempotencyKey: claimed.message.idempotencyKey,
      };
      result = await this.smtp.send(providerRequest);
    } catch (error) {
      await this.completeFailure(claimed, error, actor, request);
      throw new ServiceUnavailableException('Email delivery failed');
    }
    return this.completeSuccess(claimed, result, actor, request);
  }

  private async claim(
    messageId: string,
    actor: AuthenticatedUser,
    tenantId: string,
  ): Promise<ClaimedDelivery> {
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const existing = await tx.communicationMessage.findFirst({
        where: { id: messageId, tenantId },
        include: claimedMessageInclude,
      });
      if (!existing) throw new NotFoundException('Communication message not found');
      if (existing.channel !== CommunicationChannel.EMAIL) {
        throw new ConflictException('Communication message is not an email');
      }
      if (existing.status !== CommunicationMessageStatus.QUEUED) {
        throw new ConflictException('Communication message is not queued');
      }
      if (existing.availableAt > new Date()) {
        throw new ConflictException('Communication message is not available for delivery');
      }

      const provider =
        existing.provider ??
        (await tx.communicationProvider.findFirst({
          where: {
            tenantId,
            channel: CommunicationChannel.EMAIL,
            providerKey: this.smtp.providerKey,
            status: CommunicationProviderStatus.ACTIVE,
          },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        }));
      if (!provider || provider.status !== CommunicationProviderStatus.ACTIVE) {
        throw new ServiceUnavailableException('Active SMTP provider is unavailable');
      }
      if (provider.providerKey.toLowerCase() !== this.smtp.providerKey) {
        throw new ServiceUnavailableException('Configured email provider is unsupported');
      }

      const claimed = await tx.communicationMessage.updateMany({
        where: {
          id: messageId,
          tenantId,
          status: CommunicationMessageStatus.QUEUED,
        },
        data: {
          providerId: provider.id,
          status: CommunicationMessageStatus.PROCESSING,
          processingStartedAt: new Date(),
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Communication message was claimed by another process');
      }
      const previousAttempts = await tx.communicationAttempt.count({
        where: { tenantId, messageId },
      });
      const attemptNumber = previousAttempts + 1;
      const attempt = await tx.communicationAttempt.create({
        data: {
          tenantId,
          messageId,
          providerId: provider.id,
          attemptNumber,
          status: CommunicationAttemptStatus.PENDING,
          requestMetadata: {
            channel: CommunicationChannel.EMAIL,
            providerKey: provider.providerKey,
          },
        },
      });
      await tx.communicationAttempt.update({
        where: {
          tenantId_id: { tenantId, id: attempt.id },
        },
        data: {
          status: CommunicationAttemptStatus.PROCESSING,
          startedAt: new Date(),
        },
      });
      return {
        message: { ...existing, providerId: provider.id, provider },
        attemptId: attempt.id,
        attemptNumber,
      };
    });
  }

  private async completeSuccess(
    claimed: ClaimedDelivery,
    result: {
      providerMessageId?: string;
      acceptedAt: Date;
      metadata?: Record<string, unknown>;
    },
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, claimed.message.tenantId);
      await tx.communicationAttempt.update({
        where: {
          tenantId_id: {
            tenantId: claimed.message.tenantId,
            id: claimed.attemptId,
          },
        },
        data: {
          status: CommunicationAttemptStatus.ACCEPTED,
          providerMessageId: result.providerMessageId,
          responseMetadata: result.metadata
            ? sanitizeCommunicationMetadata(
                result.metadata as Prisma.InputJsonValue,
              )
            : undefined,
          completedAt: result.acceptedAt,
        },
      });
      const updated = await tx.communicationMessage.updateMany({
        where: {
          id: claimed.message.id,
          tenantId: claimed.message.tenantId,
          status: CommunicationMessageStatus.PROCESSING,
        },
        data: {
          status: CommunicationMessageStatus.SENT,
          sentAt: result.acceptedAt,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Communication message delivery state changed');
      }
      await this.audit.append(tx, {
        tenantId: claimed.message.tenantId,
        outletId: claimed.message.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'communication.email.sent',
        targetType: 'CommunicationMessage',
        targetId: claimed.message.id,
        metadata: {
          providerId: claimed.message.providerId,
          providerKey: claimed.message.provider?.providerKey,
          attemptId: claimed.attemptId,
          attemptNumber: claimed.attemptNumber,
        },
        ...request,
      });
      return {
        messageId: claimed.message.id,
        attemptId: claimed.attemptId,
        attemptNumber: claimed.attemptNumber,
        status: CommunicationMessageStatus.SENT,
        acceptedAt: result.acceptedAt,
      };
    });
  }

  private async completeFailure(
    claimed: ClaimedDelivery,
    error: unknown,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ): Promise<void> {
    const failure =
      error instanceof CommunicationProviderError
        ? error
        : new CommunicationProviderError('Email delivery failed', 'EMAIL_DELIVERY_FAILED', false);
    await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, claimed.message.tenantId);
      await tx.communicationAttempt.update({
        where: {
          tenantId_id: {
            tenantId: claimed.message.tenantId,
            id: claimed.attemptId,
          },
        },
        data: {
          status: failure.retryable
            ? CommunicationAttemptStatus.RETRYABLE_FAILED
            : CommunicationAttemptStatus.TERMINAL_FAILED,
          errorCode: failure.code.slice(0, 120),
          errorClassification: failure.retryable ? 'RETRYABLE' : 'TERMINAL',
          completedAt: new Date(),
        },
      });
      await tx.communicationMessage.updateMany({
        where: {
          id: claimed.message.id,
          tenantId: claimed.message.tenantId,
          status: CommunicationMessageStatus.PROCESSING,
        },
        data: {
          status: CommunicationMessageStatus.FAILED,
          failedAt: new Date(),
        },
      });
      await this.audit.append(tx, {
        tenantId: claimed.message.tenantId,
        outletId: claimed.message.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: 'communication.email.failed',
        targetType: 'CommunicationMessage',
        targetId: claimed.message.id,
        result: AuditResult.FAILED,
        reason: failure.code,
        metadata: {
          providerId: claimed.message.providerId,
          providerKey: claimed.message.provider?.providerKey,
          attemptId: claimed.attemptId,
          attemptNumber: claimed.attemptNumber,
          retryable: failure.retryable,
        },
        ...request,
      });
    });
  }
}
