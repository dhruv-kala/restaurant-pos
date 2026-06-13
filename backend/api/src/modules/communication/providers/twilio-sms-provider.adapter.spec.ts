import { CommunicationChannel } from '@prisma/client';

import {
  CommunicationProviderError,
  type CommunicationProviderRequest,
} from './communication-provider.adapter';
import { TwilioSmsProviderAdapter } from './twilio-sms-provider.adapter';
import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

const request: CommunicationProviderRequest = {
  messageId: 'message-1',
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  providerKey: 'twilio',
  configuration: {
    accountSid: `AC${'a'.repeat(32)}`,
    fromNumber: '+15551234567',
  },
  secretReference: 'env:TWILIO_AUTH_TOKEN',
  channel: CommunicationChannel.SMS,
  destination: '+919876543210',
  body: 'Order A-42 is ready',
  idempotencyKey: 'sms:1',
};

function response(status: number, body: Record<string, unknown>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('TwilioSmsProviderAdapter', () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_AUTH_TOKEN = 'secret';
    global.fetch = fetchMock;
  });

  afterAll(() => {
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  it('sends an E.164 SMS with provider privacy controls', async () => {
    fetchMock.mockResolvedValue(
      response(201, {
        sid: `SM${'b'.repeat(32)}`,
        status: 'queued',
        num_segments: '1',
      }),
    );
    const adapter = new TwilioSmsProviderAdapter(new CommunicationSecretResolver());

    await expect(adapter.send(request)).resolves.toMatchObject({
      providerMessageId: `SM${'b'.repeat(32)}`,
      metadata: { providerStatus: 'queued', segmentCount: 1 },
    });
    const call = fetchMock.mock.calls[0];
    const options = call[1] as RequestInit;
    const form = options.body as URLSearchParams;
    expect(call[0]).toBe(
      `https://api.twilio.com/2010-04-01/Accounts/AC${'a'.repeat(32)}/Messages.json`,
    );
    expect(form.get('To')).toBe('+919876543210');
    expect(form.get('ContentRetention')).toBe('discard');
    expect(form.get('AddressRetention')).toBe('obfuscate');
  });

  it('rejects invalid phone numbers before calling Twilio', async () => {
    const adapter = new TwilioSmsProviderAdapter(new CommunicationSecretResolver());

    await expect(adapter.send({ ...request, destination: '9876543210' })).rejects.toMatchObject<
      Partial<CommunicationProviderError>
    >({
      code: 'SMS_RECIPIENT_INVALID',
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('classifies rate limits as retryable without exposing provider messages', async () => {
    fetchMock.mockResolvedValue(response(429, { code: 20429, message: 'sensitive' }));
    const adapter = new TwilioSmsProviderAdapter(new CommunicationSecretResolver());

    await expect(adapter.send(request)).rejects.toMatchObject<Partial<CommunicationProviderError>>({
      code: 'TWILIO_20429',
      retryable: true,
      message: 'Twilio rejected the SMS request',
    });
  });
});
