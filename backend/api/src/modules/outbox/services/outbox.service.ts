import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { OutboxEventScope, Prisma, type OutboxEvent } from '@prisma/client';
import { createHash } from 'node:crypto';

import type { EnqueueOutboxEvent } from '../models/outbox-event.model';
import { redactOutboxPayload, stableStringify } from './outbox-payload.util';

@Injectable()
export class OutboxService {
  async enqueue(
    transaction: Prisma.TransactionClient,
    input: EnqueueOutboxEvent,
  ): Promise<OutboxEvent> {
    const normalized = this.normalize(input);
    const redactedPayload = redactOutboxPayload(normalized.payload);
    const requestFingerprint = this.fingerprint(normalized);
    const existing = await transaction.outboxEvent.findUnique({
      where: {
        scopeKey_eventType_idempotencyKey: {
          scopeKey: normalized.scopeKey,
          eventType: normalized.eventType,
          idempotencyKey: normalized.idempotencyKey,
        },
      },
    });
    if (existing) {
      this.assertIdempotentMatch(existing.requestFingerprint, requestFingerprint);
      return existing;
    }

    try {
      return await transaction.outboxEvent.create({
        data: {
          scope: normalized.scope,
          scopeKey: normalized.scopeKey,
          tenantId: normalized.tenantId,
          outletId: normalized.outletId,
          eventType: normalized.eventType,
          aggregateType: normalized.aggregateType,
          aggregateId: normalized.aggregateId,
          idempotencyKey: normalized.idempotencyKey,
          requestFingerprint,
          payload: normalized.payload,
          redactedPayload,
          availableAt: normalized.availableAt,
          createdByUserId: normalized.createdByUserId,
        },
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const concurrent = await transaction.outboxEvent.findUnique({
        where: {
          scopeKey_eventType_idempotencyKey: {
            scopeKey: normalized.scopeKey,
            eventType: normalized.eventType,
            idempotencyKey: normalized.idempotencyKey,
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

  private normalize(input: EnqueueOutboxEvent): NormalizedOutboxEvent {
    const eventType = this.requiredText(input.eventType, 'eventType', 160);
    const idempotencyKey = this.requiredText(input.idempotencyKey, 'idempotencyKey', 180);
    const aggregateType = this.optionalText(input.aggregateType, 100);
    const aggregateId = this.optionalText(input.aggregateId, 160);
    const tenantId = this.optionalText(input.tenantId, 36);
    const outletId = this.optionalText(input.outletId, 36);
    if (input.scope === OutboxEventScope.PLATFORM) {
      if (tenantId || outletId) {
        throw new BadRequestException('Platform outbox events cannot include tenantId or outletId');
      }
      return {
        scope: input.scope,
        scopeKey: 'platform',
        tenantId: null,
        outletId: null,
        eventType,
        aggregateType,
        aggregateId,
        idempotencyKey,
        payload: input.payload,
        availableAt: input.availableAt ?? undefined,
        createdByUserId: this.optionalText(input.createdByUserId, 36),
      };
    }
    if (input.scope !== OutboxEventScope.TENANT) {
      throw new BadRequestException('Unsupported outbox event scope');
    }
    if (!tenantId) {
      throw new BadRequestException('tenantId is required for tenant outbox events');
    }
    return {
      scope: input.scope,
      scopeKey: tenantId,
      tenantId,
      outletId,
      eventType,
      aggregateType,
      aggregateId,
      idempotencyKey,
      payload: input.payload,
      availableAt: input.availableAt ?? undefined,
      createdByUserId: this.optionalText(input.createdByUserId, 36),
    };
  }

  private fingerprint(input: NormalizedOutboxEvent): string {
    return createHash('sha256')
      .update(
        stableStringify({
          scope: input.scope,
          scopeKey: input.scopeKey,
          tenantId: input.tenantId,
          outletId: input.outletId,
          eventType: input.eventType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          idempotencyKey: input.idempotencyKey,
          payload: input.payload,
          availableAt: input.availableAt?.toISOString() ?? null,
          createdByUserId: input.createdByUserId,
        }),
      )
      .digest('hex');
  }

  private assertIdempotentMatch(actual: string, expected: string): void {
    if (actual !== expected) {
      throw new ConflictException('Idempotency key was already used for a different outbox event');
    }
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private requiredText(value: string, field: string, maxLength: number): string {
    const trimmed = value.trim();
    if (!trimmed) throw new BadRequestException(`${field} is required`);
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or fewer`);
    }
    return trimmed;
  }

  private optionalText(value: string | null | undefined, maxLength: number): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`Value must be ${maxLength} characters or fewer`);
    }
    return trimmed;
  }
}

interface NormalizedOutboxEvent {
  scope: OutboxEventScope;
  scopeKey: string;
  tenantId: string | null;
  outletId: string | null;
  eventType: string;
  aggregateType: string | null;
  aggregateId: string | null;
  idempotencyKey: string;
  payload: Prisma.InputJsonValue;
  availableAt?: Date;
  createdByUserId: string | null;
}
