import { BadRequestException, Injectable } from '@nestjs/common';
import type { CommunicationProvider, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

import { sanitizeCommunicationMetadata } from './communication-metadata.util';

export type CommunicationDeliveryEventType =
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'
  | 'COMPLAINT'
  | 'READ'
  | 'IGNORED';

export interface NormalizedCommunicationWebhook {
  providerEventId: string;
  providerMessageId: string;
  eventType: CommunicationDeliveryEventType;
  errorCode?: string;
  eventMetadata?: Prisma.InputJsonValue;
  occurredAt: Date;
}

@Injectable()
export class CommunicationWebhookNormalizer {
  normalize(
    provider: CommunicationProvider,
    body: unknown,
  ): NormalizedCommunicationWebhook {
    return provider.providerKey.toLowerCase() === 'twilio'
      ? this.twilio(body)
      : this.generic(body);
  }

  private twilio(body: unknown): NormalizedCommunicationWebhook {
    const input = this.object(body);
    const providerMessageId = this.requiredString(input.MessageSid, 'MessageSid');
    const providerStatus = this.optionalString(input.MessageStatus)?.toLowerCase();
    const eventTypeValue = this.optionalString(input.EventType)?.toUpperCase();
    const eventType: CommunicationDeliveryEventType =
      eventTypeValue === 'READ'
        ? 'READ'
        : providerStatus === 'delivered'
          ? 'DELIVERED'
          : providerStatus === 'failed' || providerStatus === 'undelivered'
            ? 'FAILED'
            : 'IGNORED';
    return {
      providerEventId: createHash('sha256').update(this.canonical(input)).digest('hex'),
      providerMessageId,
      eventType,
      errorCode: this.optionalString(input.ErrorCode)?.slice(0, 120),
      eventMetadata: sanitizeCommunicationMetadata({
        providerStatus: providerStatus ?? 'unknown',
        ...(eventTypeValue ? { eventType: eventTypeValue } : {}),
        ...(this.optionalString(input.ChannelPrefix)
          ? { channelPrefix: this.optionalString(input.ChannelPrefix)! }
          : {}),
      }),
      occurredAt: new Date(),
    };
  }

  private generic(body: unknown): NormalizedCommunicationWebhook {
    const input = this.object(body);
    const eventType = this.requiredString(input.eventType, 'eventType').toUpperCase();
    if (!['DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINT', 'READ'].includes(eventType)) {
      throw new BadRequestException('Webhook eventType is unsupported');
    }
    const occurredAt = new Date(this.requiredString(input.occurredAt, 'occurredAt'));
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Webhook occurredAt is invalid');
    }
    return {
      providerEventId: this.boundedString(input.eventId, 'eventId', 255),
      providerMessageId: this.boundedString(
        input.providerMessageId,
        'providerMessageId',
        255,
      ),
      eventType: eventType as CommunicationDeliveryEventType,
      errorCode: this.optionalString(input.errorCode)?.slice(0, 120),
      eventMetadata:
        input.metadata !== undefined
          ? sanitizeCommunicationMetadata(this.scalarMetadata(input.metadata))
          : undefined,
      occurredAt,
    };
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw new BadRequestException('Webhook payload is invalid');
    }
    return value as Record<string, unknown>;
  }

  private requiredString(value: unknown, field: string): string {
    const normalized = this.optionalString(value);
    if (!normalized) throw new BadRequestException(`Webhook ${field} is required`);
    return normalized;
  }

  private boundedString(value: unknown, field: string, maximum: number): string {
    const normalized = this.requiredString(value, field);
    if (normalized.length > maximum) {
      throw new BadRequestException(`Webhook ${field} is too long`);
    }
    return normalized;
  }

  private canonical(value: Record<string, unknown>): string {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value)
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
    );
  }

  private scalarMetadata(value: unknown): Prisma.InputJsonValue {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw new BadRequestException('Webhook metadata is invalid');
    }
    const entries = Object.entries(value);
    if (entries.length > 50) {
      throw new BadRequestException('Webhook metadata is invalid');
    }
    const metadata: Record<string, string | number | boolean> = {};
    for (const [key, item] of entries) {
      if (
        !/^[A-Za-z0-9_.-]{1,80}$/.test(key) ||
        !['string', 'number', 'boolean'].includes(typeof item) ||
        (typeof item === 'string' && (item.length > 1000 || item.includes('\0')))
      ) {
        throw new BadRequestException('Webhook metadata is invalid');
      }
      metadata[key] = item as string | number | boolean;
    }
    return metadata;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() && !/[\r\n\0]/.test(value)
      ? value.trim()
      : undefined;
  }
}
