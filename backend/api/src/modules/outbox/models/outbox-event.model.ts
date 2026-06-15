import type { OutboxEventScope, Prisma } from '@prisma/client';

export interface EnqueueOutboxEvent {
  scope: OutboxEventScope;
  tenantId?: string | null;
  outletId?: string | null;
  eventType: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  idempotencyKey: string;
  payload: Prisma.InputJsonValue;
  availableAt?: Date | null;
  createdByUserId?: string | null;
}
