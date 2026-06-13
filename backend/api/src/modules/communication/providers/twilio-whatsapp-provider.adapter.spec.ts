import { CommunicationChannel } from '@prisma/client';

import {
  CommunicationProviderError,
  type CommunicationProviderRequest,
} from './communication-provider.adapter';
import { TwilioMessagesClient } from './twilio-messages.client';
import { TwilioWhatsAppProviderAdapter } from './twilio-whatsapp-provider.adapter';
import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

const templateId = '01890f4e-7b1c-7abc-8def-1234567890ab';
const templateVersionId = '01890f4e-7b1c-7abc-8def-1234567890ac';
const contentSid = `HX${'c'.repeat(32)}`;
const request: CommunicationProviderRequest = {
  messageId: 'message-1',
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  providerKey: 'twilio',
  configuration: {
    accountSid: `AC${'a'.repeat(32)}`,
    fromNumber: '+15551234567',
    approvedTemplates: {
      [templateVersionId]: {
        contentSid,
        variableNames: ['1', '2'],
      },
    },
  },
  secretReference: 'env:TWILIO_AUTH_TOKEN',
  channel: CommunicationChannel.WHATSAPP,
  destination: '+919876543210',
  templateId,
  templateVersionId,
  body: 'Order A-42 is ready',
  metadata: {
    whatsappVariables: {
      '1': 'A-42',
      '2': 'Counter',
    },
  },
  idempotencyKey: 'whatsapp:1',
};

function response(status: number, body: Record<string, unknown>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('TwilioWhatsAppProviderAdapter', () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_AUTH_TOKEN = 'secret';
    global.fetch = fetchMock;
  });

  afterAll(() => {
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  it('sends only the approved provider template and scalar variables', async () => {
    fetchMock.mockResolvedValue(
      response(201, {
        sid: `SM${'b'.repeat(32)}`,
        status: 'queued',
      }),
    );
    const adapter = thisAdapter();

    await expect(adapter.send(request)).resolves.toMatchObject({
      providerMessageId: `SM${'b'.repeat(32)}`,
      metadata: { providerStatus: 'queued', contentSid },
    });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const form = options.body as URLSearchParams;
    expect(form.get('To')).toBe('whatsapp:+919876543210');
    expect(form.get('From')).toBe('whatsapp:+15551234567');
    expect(form.get('ContentSid')).toBe(contentSid);
    expect(form.get('ContentVariables')).toBe(JSON.stringify({ '1': 'A-42', '2': 'Counter' }));
    expect(form.has('Body')).toBe(false);
  });

  it('rejects internal template versions that are not provider-approved', async () => {
    await expect(
      thisAdapter().send({
        ...request,
        templateVersionId: '01890f4e-7b1c-7abc-8def-1234567890ad',
      }),
    ).rejects.toMatchObject<Partial<CommunicationProviderError>>({
      code: 'WHATSAPP_TEMPLATE_NOT_APPROVED',
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects template variables that do not match the approved contract', async () => {
    await expect(
      thisAdapter().send({
        ...request,
        metadata: { whatsappVariables: { '1': 'A-42' } },
      }),
    ).rejects.toMatchObject<Partial<CommunicationProviderError>>({
      code: 'WHATSAPP_TEMPLATE_VARIABLES_INVALID',
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function thisAdapter(): TwilioWhatsAppProviderAdapter {
  return new TwilioWhatsAppProviderAdapter(
    new CommunicationSecretResolver(),
    new TwilioMessagesClient(),
  );
}
