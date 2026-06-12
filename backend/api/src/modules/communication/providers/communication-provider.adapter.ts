import type { CommunicationChannel } from '@prisma/client';

export interface CommunicationProviderRequest {
  messageId: string;
  tenantId: string;
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

export interface CommunicationProviderAdapter {
  readonly providerKey: string;
  readonly channel: CommunicationChannel;
  send(request: CommunicationProviderRequest): Promise<CommunicationProviderResult>;
}
