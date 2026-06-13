import { CommunicationChannel } from '@prisma/client';

import {
  CommunicationProviderError,
  type CommunicationProviderRequest,
} from './communication-provider.adapter';
import type { FirebaseAccessTokenProvider } from './firebase-access-token.provider';
import { FirebasePushProviderAdapter } from './firebase-push-provider.adapter';

const request: CommunicationProviderRequest = {
  messageId: 'message-1',
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  providerKey: 'firebase',
  configuration: {
    projectId: 'serveiq-demo',
  },
  secretReference: 'env:FIREBASE_SERVICE_ACCOUNT',
  channel: CommunicationChannel.PUSH,
  destination: 'fcm-device-token-abcdefghijklmnopqrstuvwxyz',
  subject: 'Order ready',
  body: 'Order A-42 is ready for pickup',
  metadata: {
    pushData: {
      orderId: 'A-42',
      ready: true,
    },
  },
  idempotencyKey: 'push:1',
};

function response(status: number, body: Record<string, unknown>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('FirebasePushProviderAdapter', () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  const accessTokens = {
    get: jest.fn().mockResolvedValue('oauth-token'),
  } as unknown as FirebaseAccessTokenProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it('sends an immutable notification and scalar data payload through FCM HTTP v1', async () => {
    fetchMock.mockResolvedValue(
      response(200, {
        name: 'projects/serveiq-demo/messages/message-1',
      }),
    );
    const adapter = new FirebasePushProviderAdapter(accessTokens);

    await expect(adapter.send(request)).resolves.toMatchObject({
      providerMessageId: 'projects/serveiq-demo/messages/message-1',
      metadata: { providerStatus: 'accepted' },
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://fcm.googleapis.com/v1/projects/serveiq-demo/messages:send');
    expect((options?.headers as Record<string, string>).Authorization).toBe(
      'Bearer oauth-token',
    );
    expect(JSON.parse(options?.body as string)).toEqual({
      message: {
        token: request.destination,
        notification: {
          title: request.subject,
          body: request.body,
        },
        data: {
          orderId: 'A-42',
          ready: 'true',
        },
      },
    });
  });

  it('marks FCM UNREGISTERED as a terminal invalid destination', async () => {
    fetchMock.mockResolvedValue(
      response(404, {
        error: {
          status: 'NOT_FOUND',
          details: [
            {
              '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
              errorCode: 'UNREGISTERED',
            },
          ],
        },
      }),
    );
    const adapter = new FirebasePushProviderAdapter(accessTokens);

    await expect(adapter.send(request)).rejects.toMatchObject<
      Partial<CommunicationProviderError>
    >({
      code: 'FCM_TOKEN_UNREGISTERED',
      retryable: false,
      invalidDestination: true,
    });
  });

  it('rejects reserved or nested push data before provider access', async () => {
    const adapter = new FirebasePushProviderAdapter(accessTokens);

    await expect(
      adapter.send({
        ...request,
        metadata: { pushData: { 'google.internal': 'value' } },
      }),
    ).rejects.toMatchObject<Partial<CommunicationProviderError>>({
      code: 'PUSH_DATA_INVALID',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
