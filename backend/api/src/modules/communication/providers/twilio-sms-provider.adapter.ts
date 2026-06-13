import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '@prisma/client';

import {
  CommunicationProviderError,
  type CommunicationProviderAdapter,
  type CommunicationProviderRequest,
  type CommunicationProviderResult,
} from './communication-provider.adapter';
import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

interface TwilioSmsConfiguration {
  accountSid: string;
  fromNumber?: string;
  messagingServiceSid?: string;
  timeoutMs: number;
}

interface TwilioMessageResponse {
  sid?: unknown;
  status?: unknown;
  code?: unknown;
  error_code?: unknown;
  num_segments?: unknown;
}

@Injectable()
export class TwilioSmsProviderAdapter implements CommunicationProviderAdapter {
  readonly providerKey = 'twilio';
  readonly channel = CommunicationChannel.SMS;

  constructor(private readonly secrets: CommunicationSecretResolver) {}

  async send(request: CommunicationProviderRequest): Promise<CommunicationProviderResult> {
    if (request.channel !== CommunicationChannel.SMS) {
      throw new CommunicationProviderError(
        'Twilio SMS supports SMS messages only',
        'UNSUPPORTED_CHANNEL',
        false,
      );
    }
    if (!this.e164(request.destination)) {
      throw new CommunicationProviderError(
        'SMS recipient must use E.164 format',
        'SMS_RECIPIENT_INVALID',
        false,
      );
    }
    const body = request.body.trim();
    if (!body || body.length > 1600) {
      throw new CommunicationProviderError(
        'SMS body must contain between 1 and 1600 characters',
        'SMS_CONTENT_INVALID',
        false,
      );
    }
    const configuration = this.configuration(request.configuration);
    const authToken = this.secrets.resolve(request.secretReference);
    if (!authToken) {
      throw new CommunicationProviderError(
        'Twilio credentials are unavailable',
        'TWILIO_CREDENTIALS_UNAVAILABLE',
        false,
      );
    }

    const form = new URLSearchParams({
      To: request.destination,
      Body: body,
      ContentRetention: 'discard',
      AddressRetention: 'obfuscate',
    });
    if (configuration.fromNumber) {
      form.set('From', configuration.fromNumber);
    } else {
      form.set('MessagingServiceSid', configuration.messagingServiceSid!);
    }

    let response: Response;
    try {
      response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${configuration.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${configuration.accountSid}:${authToken}`,
            ).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
          signal: AbortSignal.timeout(configuration.timeoutMs),
        },
      );
    } catch {
      throw new CommunicationProviderError(
        'Twilio SMS request failed',
        'TWILIO_NETWORK_ERROR',
        true,
      );
    }

    const payload = await this.response(response);
    if (!response.ok) {
      const errorCode =
        typeof payload.code === 'number'
          ? payload.code
          : typeof payload.error_code === 'number'
            ? payload.error_code
            : undefined;
      const providerCode =
        errorCode !== undefined
          ? `TWILIO_${errorCode}`
          : `TWILIO_HTTP_${response.status}`;
      throw new CommunicationProviderError(
        'Twilio rejected the SMS request',
        providerCode,
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }

    const providerMessageId = typeof payload.sid === 'string' ? payload.sid : undefined;
    const status = typeof payload.status === 'string' ? payload.status : 'accepted';
    if (!providerMessageId) {
      throw new CommunicationProviderError(
        'Twilio response did not include a message identifier',
        'TWILIO_RESPONSE_INVALID',
        false,
      );
    }
    if (status === 'failed' || status === 'undelivered') {
      throw new CommunicationProviderError(
        'Twilio reported immediate SMS failure',
        typeof payload.error_code === 'number'
          ? `TWILIO_${payload.error_code}`
          : 'TWILIO_IMMEDIATE_FAILURE',
        false,
      );
    }

    return {
      providerMessageId,
      acceptedAt: new Date(),
      metadata: {
        providerStatus: status,
        segmentCount:
          typeof payload.num_segments === 'string' ? Number(payload.num_segments) : undefined,
      },
    };
  }

  private configuration(value: unknown): TwilioSmsConfiguration {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw this.invalidConfiguration();
    }
    const input = value as Record<string, unknown>;
    const accountSid = this.string(input.accountSid);
    const fromNumber = this.string(input.fromNumber);
    const messagingServiceSid = this.string(input.messagingServiceSid);
    if (
      !accountSid ||
      !/^AC[0-9a-fA-F]{32}$/.test(accountSid) ||
      Boolean(fromNumber) === Boolean(messagingServiceSid) ||
      (fromNumber !== undefined && !this.e164(fromNumber)) ||
      (messagingServiceSid !== undefined && !/^MG[0-9a-fA-F]{32}$/.test(messagingServiceSid))
    ) {
      throw this.invalidConfiguration();
    }
    return {
      accountSid,
      fromNumber,
      messagingServiceSid,
      timeoutMs: this.integer(input.timeoutMs, 1000, 120000) ?? 15000,
    };
  }

  private async response(response: Response): Promise<TwilioMessageResponse> {
    try {
      const value: unknown = await response.json();
      return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  private invalidConfiguration(): CommunicationProviderError {
    return new CommunicationProviderError(
      'Twilio SMS provider configuration is invalid',
      'TWILIO_CONFIGURATION_INVALID',
      false,
    );
  }

  private string(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() && !/[\r\n\0]/.test(value)
      ? value.trim()
      : undefined;
  }

  private integer(value: unknown, minimum: number, maximum: number): number | undefined {
    return typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= minimum &&
      value <= maximum
      ? value
      : undefined;
  }

  private e164(value: string): boolean {
    return /^\+[1-9]\d{7,14}$/.test(value);
  }
}
