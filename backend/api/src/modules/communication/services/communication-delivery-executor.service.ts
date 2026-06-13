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
  type CommunicationProviderAdapter,
  type CommunicationProviderRequest,
  type CommunicationProviderResult,
} from '../providers/communication-provider.adapter';
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

export interface CommunicationDeliveryDefinition {
  channel: CommunicationChannel;
  auditChannel: string;
  adapter: CommunicationProviderAdapter;
  onFailure?: (
    transaction: Prisma.TransactionClient,
    context: CommunicationDeliveryFailureContext,
  ) => Promise<void>;
}

export interface CommunicationDeliveryFailureContext {
  tenantId: string;
  outletId: string | null;
  messageId: string;
  recipientAddressHash: string;
  error: CommunicationProviderError;
  actor: AuthenticatedUser;
  request: AuditRequestMetadata;
}

@Injectable()
export class CommunicationDeliveryExecutor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly addresses: CommunicationAddressProtector,
  ) {}

  async deliver(
    messageId: string,
    actor: AuthenticatedUser,
    definition: CommunicationDeliveryDefinition,
    requestedTenantId?: string,
    request: AuditRequestMetadata = {},
  ) {
    requireCommunicationSend(actor);
    const scope = resolveCommunicationScope(actor, requestedTenantId);
    const claimed = await this.claim(messageId, actor, scope.tenantId, definition);

    let result: CommunicationProviderResult;
    try {
      const destination = this.addresses.decrypt(claimed.message.recipientAddressCiphertext);
      const provider = claimed.message.provider;
      if (!provider) {
        throw new CommunicationProviderError(
          'Communication provider is unavailable',
          'COMMUNICATION_PROVIDER_UNAVAILABLE',
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
        templateId: claimed.message.templateId,
        templateVersionId: claimed.message.templateVersionId,
        subject: claimed.message.subjectSnapshot,
        body: claimed.message.bodySnapshot,
        metadata: claimed.message.metadata,
        idempotencyKey: claimed.message.idempotencyKey,
      };
      result = await definition.adapter.send(providerRequest);
    } catch (error) {
      await this.completeFailure(claimed, error, actor, definition, request);
      throw new ServiceUnavailableException(
        `${this.channelLabel(definition.channel)} delivery failed`,
      );
    }
    return this.completeSuccess(claimed, result, actor, definition, request);
  }

  private async claim(
    messageId: string,
    actor: AuthenticatedUser,
    tenantId: string,
    definition: CommunicationDeliveryDefinition,
  ): Promise<ClaimedDelivery> {
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, tenantId);
      const existing = await tx.communicationMessage.findFirst({
        where: { id: messageId, tenantId },
        include: claimedMessageInclude,
      });
      if (!existing) throw new NotFoundException('Communication message not found');
      if (existing.channel !== definition.channel) {
        throw new ConflictException(
          `Communication message is not ${this.channelLabel(definition.channel)}`,
        );
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
            channel: definition.channel,
            providerKey: definition.adapter.providerKey,
            status: CommunicationProviderStatus.ACTIVE,
          },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        }));
      if (
        !provider ||
        provider.status !== CommunicationProviderStatus.ACTIVE ||
        provider.channel !== definition.channel
      ) {
        throw new ServiceUnavailableException(
          `Active ${definition.adapter.providerKey} provider is unavailable`,
        );
      }
      if (provider.providerKey.toLowerCase() !== definition.adapter.providerKey) {
        throw new ServiceUnavailableException(
          `Configured ${this.channelLabel(definition.channel)} provider is unsupported`,
        );
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
            channel: definition.channel,
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
    result: CommunicationProviderResult,
    actor: AuthenticatedUser,
    definition: CommunicationDeliveryDefinition,
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
            ? sanitizeCommunicationMetadata(result.metadata as Prisma.InputJsonValue)
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
        action: `communication.${definition.auditChannel}.sent`,
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
    definition: CommunicationDeliveryDefinition,
    request: AuditRequestMetadata,
  ): Promise<void> {
    const failure =
      error instanceof CommunicationProviderError
        ? error
        : new CommunicationProviderError(
            'Communication delivery failed',
            'COMMUNICATION_DELIVERY_FAILED',
            false,
          );
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
      if (definition.onFailure) {
        await definition.onFailure(tx, {
          tenantId: claimed.message.tenantId,
          outletId: claimed.message.outletId,
          messageId: claimed.message.id,
          recipientAddressHash: claimed.message.recipientAddressHash,
          error: failure,
          actor,
          request,
        });
      }
      await this.audit.append(tx, {
        tenantId: claimed.message.tenantId,
        outletId: claimed.message.outletId,
        actorUserId: actor.id,
        actorRoles: actor.roles,
        action: `communication.${definition.auditChannel}.failed`,
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

  private channelLabel(channel: CommunicationChannel): string {
    return channel.toLowerCase();
  }
}
