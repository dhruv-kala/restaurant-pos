import {
  CommunicationChannel,
  CommunicationProviderStatus,
  type CommunicationProvider,
  type Prisma,
} from '@prisma/client';
import { createHmac } from 'node:crypto';
import { getExpectedTwilioSignature } from 'twilio';

import { CommunicationWebhookVerifier } from './communication-webhook.verifier';
import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

function provider(
  providerKey: string,
  configMetadata: Prisma.JsonValue,
): CommunicationProvider {
  return {
    id: 'provider-1',
    tenantId: 'tenant-1',
    channel: CommunicationChannel.SMS,
    providerKey,
    displayName: providerKey,
    status: CommunicationProviderStatus.ACTIVE,
    priority: 1,
    secretReference: 'env:WEBHOOK_SECRET',
    configMetadata,
    capabilities: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('CommunicationWebhookVerifier', () => {
  const verifier = new CommunicationWebhookVerifier(new CommunicationSecretResolver());

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
  });

  it('verifies Twilio form callbacks against the configured canonical URL', () => {
    process.env.WEBHOOK_SECRET = 'twilio-auth-token';
    const webhookUrl =
      'https://api.example.test/api/v1/communication/webhooks/twilio?providerId=provider-1';
    const body = {
      MessageSid: `SM${'a'.repeat(32)}`,
      MessageStatus: 'delivered',
    };
    const signature = getExpectedTwilioSignature(
      process.env.WEBHOOK_SECRET,
      webhookUrl,
      body,
    );

    expect(() =>
      verifier.verify(provider('twilio', { webhookUrl }), {
        rawBody: Buffer.from(new URLSearchParams(body).toString()),
        body,
        headers: { 'x-twilio-signature': signature },
      }),
    ).not.toThrow();
  });

  it('verifies generic HMAC-SHA256 JSON callbacks and rejects tampering', () => {
    process.env.WEBHOOK_SECRET = 'generic-webhook-secret';
    const rawBody = Buffer.from(
      JSON.stringify({
        providerId: 'provider-1',
        eventId: 'event-1',
        providerMessageId: 'message-1',
        eventType: 'DELIVERED',
        occurredAt: new Date().toISOString(),
      }),
    );
    const signature = createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    const genericProvider = provider('generic', {
      webhookVerification: { type: 'HMAC_SHA256' },
      webhookSecretReference: 'env:WEBHOOK_SECRET',
    });

    expect(() =>
      verifier.verify(genericProvider, {
        rawBody,
        body: JSON.parse(rawBody.toString()),
        headers: { 'x-communication-signature': `sha256=${signature}` },
      }),
    ).not.toThrow();
    expect(() =>
      verifier.verify(genericProvider, {
        rawBody,
        body: {
          ...JSON.parse(rawBody.toString()),
          providerId: 'provider-2',
        },
        headers: { 'x-communication-signature': `sha256=${signature}` },
      }),
    ).toThrow('Webhook signature is invalid');
    expect(() =>
      verifier.verify(genericProvider, {
        rawBody: Buffer.from(`${rawBody.toString()} `),
        body: JSON.parse(rawBody.toString()),
        headers: { 'x-communication-signature': `sha256=${signature}` },
      }),
    ).toThrow('Webhook signature is invalid');
  });
});
