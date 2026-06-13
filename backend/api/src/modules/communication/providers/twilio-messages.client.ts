import { Injectable } from '@nestjs/common';

import { CommunicationProviderError } from './communication-provider.adapter';

export interface TwilioMessageResponse {
  sid?: unknown;
  status?: unknown;
  code?: unknown;
  error_code?: unknown;
  num_segments?: unknown;
}

@Injectable()
export class TwilioMessagesClient {
  async send(
    accountSid: string,
    authToken: string,
    timeoutMs: number,
    form: URLSearchParams,
    channelLabel: string,
  ): Promise<TwilioMessageResponse> {
    let response: Response;
    try {
      response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
    } catch {
      throw new CommunicationProviderError(
        `Twilio ${channelLabel} request failed`,
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
        errorCode !== undefined ? `TWILIO_${errorCode}` : `TWILIO_HTTP_${response.status}`;
      throw new CommunicationProviderError(
        `Twilio rejected the ${channelLabel} request`,
        providerCode,
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }
    return payload;
  }

  private async response(response: Response): Promise<TwilioMessageResponse> {
    try {
      const value: unknown = await response.json();
      return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }
}
