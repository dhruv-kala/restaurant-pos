import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CommunicationRecipientType, Prisma, type CommunicationMessage } from '@prisma/client';
import { createHash } from 'node:crypto';

import type { EnqueueCommunicationMessage } from '../models/communication-message.model';
import { sanitizeCommunicationMetadata } from './communication-metadata.util';

@Injectable()
export class CommunicationService {
  async enqueue(
    transaction: Prisma.TransactionClient,
    input: EnqueueCommunicationMessage,
  ): Promise<CommunicationMessage> {
    this.validate(input);
    const metadata = input.metadata ? sanitizeCommunicationMetadata(input.metadata) : undefined;
    const requestFingerprint = this.fingerprint(input, metadata);
    const existing = await transaction.communicationMessage.findUnique({
      where: {
        tenantId_channel_idempotencyKey: {
          tenantId: input.tenantId,
          channel: input.channel,
          idempotencyKey: input.idempotencyKey.trim(),
        },
      },
    });
    if (existing) {
      this.assertIdempotentMatch(existing.requestFingerprint, requestFingerprint);
      return existing;
    }

    try {
      return await transaction.communicationMessage.create({
        data: {
          tenantId: input.tenantId,
          outletId: input.outletId,
          notificationId: input.notificationId,
          providerId: input.providerId,
          templateId: input.templateId,
          templateVersionId: input.templateVersionId,
          channel: input.channel,
          recipientType: input.recipientType,
          recipientUserId: input.recipientUserId,
          recipientReferenceId: input.recipientReferenceId,
          recipientAddressCiphertext: input.recipientAddressCiphertext.trim(),
          recipientAddressHash: input.recipientAddressHash.toLowerCase(),
          recipientAddressMasked: input.recipientAddressMasked.trim(),
          subjectSnapshot: input.subjectSnapshot?.trim(),
          bodySnapshot: input.bodySnapshot.trim(),
          locale: input.locale?.trim() || 'en',
          idempotencyKey: input.idempotencyKey.trim(),
          requestFingerprint,
          metadata,
          scheduledAt: input.scheduledAt,
          availableAt: input.scheduledAt ?? new Date(),
        },
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const concurrent = await transaction.communicationMessage.findUnique({
        where: {
          tenantId_channel_idempotencyKey: {
            tenantId: input.tenantId,
            channel: input.channel,
            idempotencyKey: input.idempotencyKey.trim(),
          },
        },
      });
      if (concurrent) {
        this.assertIdempotentMatch(concurrent.requestFingerprint, requestFingerprint);
        return concurrent;
      }
      throw error;
    }
  }

  private validate(input: EnqueueCommunicationMessage): void {
    if (!/^[0-9a-f]{64}$/i.test(input.recipientAddressHash)) {
      throw new BadRequestException('recipientAddressHash must be a SHA-256 hex digest');
    }
    if (
      !input.recipientAddressCiphertext.trim() ||
      !input.recipientAddressMasked.trim() ||
      !input.bodySnapshot.trim() ||
      !input.idempotencyKey.trim()
    ) {
      throw new BadRequestException(
        'Protected recipient address, body, and idempotency key are required',
      );
    }
    if (input.recipientType === CommunicationRecipientType.USER && !input.recipientUserId) {
      throw new BadRequestException('recipientUserId is required for USER recipients');
    }
    if (input.recipientType !== CommunicationRecipientType.USER && input.recipientUserId) {
      throw new BadRequestException('recipientUserId is valid only for USER recipients');
    }
    if (
      input.recipientType === CommunicationRecipientType.CUSTOMER &&
      !input.recipientReferenceId
    ) {
      throw new BadRequestException('recipientReferenceId is required for CUSTOMER recipients');
    }
    if (Boolean(input.templateId) !== Boolean(input.templateVersionId)) {
      throw new BadRequestException('templateId and templateVersionId must be provided together');
    }
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private assertIdempotentMatch(actual: string, expected: string): void {
    if (actual !== expected) {
      throw new ConflictException(
        'Idempotency key was already used for a different communication request',
      );
    }
  }

  private fingerprint(
    input: EnqueueCommunicationMessage,
    metadata: Prisma.InputJsonValue | undefined,
  ): string {
    const payload = {
      tenantId: input.tenantId,
      outletId: input.outletId ?? null,
      notificationId: input.notificationId ?? null,
      providerId: input.providerId ?? null,
      templateId: input.templateId ?? null,
      templateVersionId: input.templateVersionId ?? null,
      channel: input.channel,
      recipientType: input.recipientType,
      recipientUserId: input.recipientUserId ?? null,
      recipientReferenceId: input.recipientReferenceId ?? null,
      recipientAddressHash: input.recipientAddressHash.toLowerCase(),
      subjectSnapshot: input.subjectSnapshot?.trim() ?? null,
      bodySnapshot: input.bodySnapshot.trim(),
      locale: input.locale?.trim() || 'en',
      metadata: metadata ?? null,
      scheduledAt: input.scheduledAt?.toISOString() ?? null,
    };
    return createHash('sha256').update(stableStringify(payload)).digest('hex');
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
