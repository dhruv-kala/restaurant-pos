import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditResult,
  CommunicationWebhookProcessingStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  CommunicationWebhookVerifier,
  type CommunicationWebhookRequest,
} from '../providers/communication-webhook.verifier';
import { CommunicationDeliveryStatusService } from './communication-delivery-status.service';
import { CommunicationWebhookNormalizer } from './communication-webhook-normalizer';

@Injectable()
export class CommunicationWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly verifier: CommunicationWebhookVerifier,
    private readonly normalizer: CommunicationWebhookNormalizer,
    private readonly deliveryStatus: CommunicationDeliveryStatusService,
  ) {}

  async ingest(
    providerKey: string,
    providerId: string,
    request: CommunicationWebhookRequest,
  ) {
    if (!/^[a-z0-9_-]{2,80}$/i.test(providerKey)) {
      throw new NotFoundException('Communication provider not found');
    }
    const provider = await this.provider(providerId, providerKey);
    try {
      this.verifier.verify(provider, request);
    } catch {
      await this.verificationFailed(provider.tenantId, provider.id, provider.providerKey);
      throw new UnauthorizedException('Webhook signature is invalid');
    }
    const webhook = this.normalizer.normalize(provider, request.body);

    return this.prisma.$transaction(async (tx) => {
      await this.systemContext(tx, provider.tenantId);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${provider.tenantId}:communication-webhook:${provider.id}:${webhook.providerEventId}`}))`;
      const existing = await tx.communicationWebhook.findUnique({
        where: {
          tenantId_providerId_providerEventId: {
            tenantId: provider.tenantId,
            providerId: provider.id,
            providerEventId: webhook.providerEventId,
          },
        },
      });
      if (existing) {
        return {
          accepted: true,
          duplicate: true,
          webhookId: existing.id,
          processingStatus: existing.processingStatus,
        };
      }

      const synchronized = await this.deliveryStatus.synchronize(tx, {
        tenantId: provider.tenantId,
        providerId: provider.id,
        webhook,
      });
      const now = new Date();
      const record = await tx.communicationWebhook.create({
        data: {
          tenantId: provider.tenantId,
          providerId: provider.id,
          messageId: synchronized.messageId,
          attemptId: synchronized.attemptId,
          providerEventId: webhook.providerEventId,
          providerMessageId: webhook.providerMessageId,
          eventType: webhook.eventType,
          processingStatus: synchronized.processingStatus,
          errorCode: webhook.errorCode,
          eventMetadata: this.metadata(webhook.eventMetadata, synchronized.reason),
          signatureVerifiedAt: now,
          occurredAt: webhook.occurredAt,
          processedAt: now,
        },
      });
      await this.audit.append(tx, {
        tenantId: provider.tenantId,
        action:
          synchronized.processingStatus === CommunicationWebhookProcessingStatus.PROCESSED
            ? 'communication.webhook.processed'
            : 'communication.webhook.ignored',
        targetType: 'CommunicationWebhook',
        targetId: record.id,
        reason: synchronized.reason,
        metadata: {
          providerId: provider.id,
          providerKey: provider.providerKey,
          eventType: webhook.eventType,
          messageId: synchronized.messageId,
          attemptId: synchronized.attemptId,
        },
      });
      return {
        accepted: true,
        duplicate: false,
        webhookId: record.id,
        processingStatus: record.processingStatus,
      };
    });
  }

  private async provider(providerId: string, providerKey: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.systemContext(tx);
      const provider = await tx.communicationProvider.findUnique({
        where: { id: providerId },
      });
      if (!provider || provider.providerKey.toLowerCase() !== providerKey.toLowerCase()) {
        throw new NotFoundException('Communication provider not found');
      }
      return provider;
    });
  }

  private async verificationFailed(
    tenantId: string,
    providerId: string,
    providerKey: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.systemContext(tx, tenantId);
      await this.audit.append(tx, {
        tenantId,
        action: 'communication.webhook.verification_failed',
        targetType: 'CommunicationProvider',
        targetId: providerId,
        result: AuditResult.FAILED,
        reason: 'INVALID_SIGNATURE',
        metadata: { providerKey },
      });
    });
  }

  private metadata(
    metadata: Prisma.InputJsonValue | undefined,
    reason: string | undefined,
  ): Prisma.InputJsonValue | undefined {
    if (!reason) return metadata;
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
      return { processingReason: reason };
    }
    return { ...metadata, processingReason: reason };
  }

  private async systemContext(
    transaction: Prisma.TransactionClient,
    tenantId?: string,
  ): Promise<void> {
    await transaction.$queryRaw`SELECT set_config('app.is_platform_admin', 'true', true)`;
    if (tenantId) {
      await transaction.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    }
  }
}
