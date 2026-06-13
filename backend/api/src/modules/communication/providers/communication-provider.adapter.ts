import type { CommunicationChannel, Prisma } from '@prisma/client';

export interface CommunicationProviderRequest {
  messageId: string;
  tenantId: string;
  providerId: string;
  providerKey: string;
  configuration: Prisma.JsonValue | null;
  secretReference: string | null;
  channel: CommunicationChannel;
  destination: string;
  subject?: string | null;
  body: string;
  idempotencyKey: string;
}

export interface CommunicationProviderResult {
  providerMessageId?: string;
  acceptedAt: Date;
  metadata?: Record<string, unknown>;
}

export class CommunicationProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = CommunicationProviderError.name;
  }
}

export interface CommunicationProviderAdapter {
  readonly providerKey: string;
  readonly channel: CommunicationChannel;
  send(request: CommunicationProviderRequest): Promise<CommunicationProviderResult>;
}
