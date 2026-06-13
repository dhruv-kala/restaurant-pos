import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '@prisma/client';

import {
  CommunicationProviderError,
  type CommunicationProviderAdapter,
  type CommunicationProviderRequest,
  type CommunicationProviderResult,
} from './communication-provider.adapter';
import { FirebaseAccessTokenProvider } from './firebase-access-token.provider';

interface FirebaseConfiguration {
  projectId: string;
  timeoutMs: number;
}

interface FirebaseErrorDetail {
  '@type'?: unknown;
  errorCode?: unknown;
}

interface FirebaseResponse {
  name?: unknown;
  error?: {
    status?: unknown;
    details?: unknown;
  };
}

@Injectable()
export class FirebasePushProviderAdapter implements CommunicationProviderAdapter {
  readonly providerKey = 'firebase';
  readonly channel = CommunicationChannel.PUSH;

  constructor(private readonly accessTokens: FirebaseAccessTokenProvider) {}

  async send(request: CommunicationProviderRequest): Promise<CommunicationProviderResult> {
    if (request.channel !== CommunicationChannel.PUSH) {
      throw new CommunicationProviderError(
        'Firebase push supports push messages only',
        'UNSUPPORTED_CHANNEL',
        false,
      );
    }
    const destination = this.destination(request.destination);
    const title = request.subject?.trim();
    const body = request.body.trim();
    if (!title || title.length > 200 || !body || body.length > 4000) {
      throw new CommunicationProviderError(
        'Push title and body are invalid',
        'PUSH_CONTENT_INVALID',
        false,
      );
    }
    const data = this.data(request.metadata);
    const configuration = this.configuration(request.configuration);
    const accessToken = await this.accessTokens.get(request.secretReference);

    let response: Response;
    try {
      response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${configuration.projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: destination,
              notification: { title, body },
              ...(Object.keys(data).length > 0 ? { data } : {}),
            },
          }),
          signal: AbortSignal.timeout(configuration.timeoutMs),
        },
      );
    } catch {
      throw new CommunicationProviderError(
        'Firebase push request failed',
        'FIREBASE_NETWORK_ERROR',
        true,
      );
    }

    const payload = await this.response(response);
    if (!response.ok) {
      throw this.providerFailure(response.status, payload);
    }
    const providerMessageId = typeof payload.name === 'string' ? payload.name : undefined;
    if (!providerMessageId) {
      throw new CommunicationProviderError(
        'Firebase response did not include a message identifier',
        'FIREBASE_RESPONSE_INVALID',
        false,
      );
    }
    return {
      providerMessageId,
      acceptedAt: new Date(),
      metadata: { providerStatus: 'accepted' },
    };
  }

  private configuration(value: unknown): FirebaseConfiguration {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw this.invalidConfiguration();
    }
    const input = value as Record<string, unknown>;
    const projectId =
      typeof input.projectId === 'string' && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(input.projectId)
        ? input.projectId
        : undefined;
    const timeoutMs =
      typeof input.timeoutMs === 'number' &&
      Number.isInteger(input.timeoutMs) &&
      input.timeoutMs >= 1000 &&
      input.timeoutMs <= 120000
        ? input.timeoutMs
        : 15000;
    if (!projectId) throw this.invalidConfiguration();
    return { projectId, timeoutMs };
  }

  private destination(value: string): string {
    const token = value.trim();
    if (token.length < 20 || token.length > 4096 || /[\s\0]/.test(token)) {
      throw new CommunicationProviderError(
        'Push device token is invalid',
        'PUSH_DESTINATION_INVALID',
        false,
        true,
      );
    }
    return token;
  }

  private data(metadata: unknown): Record<string, string> {
    const raw =
      metadata && !Array.isArray(metadata) && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>).pushData
        : undefined;
    if (raw === undefined) return {};
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
      throw this.invalidData();
    }
    const data = Object.create(null) as Record<string, string>;
    for (const [key, value] of Object.entries(raw)) {
      if (
        !/^[A-Za-z0-9_.-]{1,128}$/.test(key) ||
        /^(from|google\.|gcm\.|collapse_key$)/i.test(key) ||
        !['string', 'number', 'boolean'].includes(typeof value)
      ) {
        throw this.invalidData();
      }
      const normalized = String(value);
      if (!normalized || normalized.length > 1000 || normalized.includes('\0')) {
        throw this.invalidData();
      }
      data[key] = normalized;
    }
    if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 4096) {
      throw this.invalidData();
    }
    return data;
  }

  private providerFailure(statusCode: number, payload: FirebaseResponse) {
    const fcmError = this.fcmError(payload);
    if (fcmError === 'UNREGISTERED') {
      return new CommunicationProviderError(
        'Firebase rejected an unregistered device token',
        'FCM_TOKEN_UNREGISTERED',
        false,
        true,
      );
    }
    if (fcmError === 'INVALID_ARGUMENT') {
      return new CommunicationProviderError(
        'Firebase rejected an invalid device token',
        'FCM_TOKEN_INVALID',
        false,
        true,
      );
    }
    const status =
      typeof payload.error?.status === 'string'
        ? payload.error.status.replace(/[^A-Z0-9_]/g, '').slice(0, 80)
        : undefined;
    return new CommunicationProviderError(
      'Firebase rejected the push request',
      status ? `FCM_${status}` : `FCM_HTTP_${statusCode}`,
      statusCode === 408 || statusCode === 429 || statusCode >= 500,
    );
  }

  private fcmError(payload: FirebaseResponse): string | undefined {
    const details = Array.isArray(payload.error?.details)
      ? (payload.error.details as FirebaseErrorDetail[])
      : [];
    const detail = details.find(
      (item) => item?.['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
    );
    return typeof detail?.errorCode === 'string' ? detail.errorCode : undefined;
  }

  private async response(response: Response): Promise<FirebaseResponse> {
    try {
      const value: unknown = await response.json();
      return value && !Array.isArray(value) && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }

  private invalidConfiguration(): CommunicationProviderError {
    return new CommunicationProviderError(
      'Firebase push provider configuration is invalid',
      'FIREBASE_CONFIGURATION_INVALID',
      false,
    );
  }

  private invalidData(): CommunicationProviderError {
    return new CommunicationProviderError(
      'Push data payload is invalid',
      'PUSH_DATA_INVALID',
      false,
    );
  }
}
