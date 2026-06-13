import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CommunicationProvider, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { validateRequest } from 'twilio';

import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

export interface CommunicationWebhookRequest {
  rawBody: Buffer;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class CommunicationWebhookVerifier {
  constructor(private readonly secrets: CommunicationSecretResolver) {}

  verify(provider: CommunicationProvider, request: CommunicationWebhookRequest): void {
    const config = this.object(provider.configMetadata);
    const secretReference =
      provider.providerKey.toLowerCase() === 'twilio'
        ? provider.secretReference
        : (this.string(config.webhookSecretReference) ?? provider.secretReference);
    const secret = this.secrets.resolve(secretReference);
    if (!secret) throw new UnauthorizedException('Webhook signature is invalid');
    if (provider.providerKey.toLowerCase() === 'twilio') {
      this.verifyTwilio(provider.configMetadata, secret, request);
      return;
    }
    this.verifyHmac(provider.id, provider.configMetadata, secret, request);
  }

  private verifyTwilio(
    configuration: Prisma.JsonValue | null,
    authToken: string,
    request: CommunicationWebhookRequest,
  ): void {
    const config = this.object(configuration);
    const webhookUrl = this.string(config.webhookUrl);
    const signature = this.header(request.headers, 'x-twilio-signature');
    const parameters = this.stringParameters(request.body);
    if (
      !webhookUrl ||
      !/^https:\/\/[^\s]+$/i.test(webhookUrl) ||
      !signature ||
      !parameters ||
      !validateRequest(authToken, signature, webhookUrl, parameters)
    ) {
      throw new UnauthorizedException('Webhook signature is invalid');
    }
  }

  private verifyHmac(
    providerId: string,
    configuration: Prisma.JsonValue | null,
    secret: string,
    request: CommunicationWebhookRequest,
  ): void {
    const config = this.object(configuration);
    const verification = this.object(config.webhookVerification);
    const signatureHeader =
      this.string(verification.signatureHeader)?.toLowerCase() ??
      'x-communication-signature';
    const signature = this.header(request.headers, signatureHeader)?.replace(/^sha256=/i, '');
    const body = this.object(request.body);
    if (
      verification.type !== 'HMAC_SHA256' ||
      body.providerId !== providerId ||
      !/^[0-9a-f]{64}$/i.test(signature ?? '')
    ) {
      throw new UnauthorizedException('Webhook signature is invalid');
    }
    const expected = createHmac('sha256', secret).update(request.rawBody).digest();
    const actual = Buffer.from(signature!, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('Webhook signature is invalid');
    }
  }

  private stringParameters(value: unknown): Record<string, string> | undefined {
    if (!value || Array.isArray(value) || typeof value !== 'object') return undefined;
    const parameters: Record<string, string> = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item !== 'string') return undefined;
      parameters[key] = item;
    }
    return parameters;
  }

  private object(value: unknown): Record<string, unknown> {
    return value && !Array.isArray(value) && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private string(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private header(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}
