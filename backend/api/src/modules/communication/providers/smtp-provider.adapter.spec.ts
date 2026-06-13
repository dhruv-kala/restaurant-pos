import { CommunicationChannel } from '@prisma/client';
import nodemailer from 'nodemailer';

import {
  CommunicationProviderError,
  type CommunicationProviderRequest,
} from './communication-provider.adapter';
import { SmtpProviderAdapter } from './smtp-provider.adapter';
import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

const request: CommunicationProviderRequest = {
  messageId: 'message-1',
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  providerKey: 'smtp',
  configuration: {
    host: 'smtp.example.test',
    port: 587,
    secure: false,
    username: 'mailer',
    fromAddress: 'no-reply@example.test',
  },
  secretReference: 'env:SMTP_PASSWORD',
  channel: CommunicationChannel.EMAIL,
  destination: 'customer@example.test',
  subject: 'Subject',
  body: 'Body',
  idempotencyKey: 'email:1',
};

describe('SmtpProviderAdapter', () => {
  const createTransport = nodemailer.createTransport as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMTP_PASSWORD = 'secret';
  });

  afterAll(() => {
    delete process.env.SMTP_PASSWORD;
  });

  it('sends an email and returns safe provider metadata', async () => {
    const sendMail = jest.fn().mockResolvedValue({
      accepted: ['customer@example.test'],
      rejected: [],
      messageId: 'smtp-message-1',
      response: '250 accepted',
    });
    const close = jest.fn();
    createTransport.mockReturnValue({ sendMail, close });
    const adapter = new SmtpProviderAdapter(new CommunicationSecretResolver());

    await expect(adapter.send(request)).resolves.toMatchObject({
      providerMessageId: 'smtp-message-1',
      metadata: { acceptedCount: 1, rejectedCount: 0, responseCode: 250 },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.test',
        subject: 'Subject',
        text: 'Body',
      }),
    );
    expect(close).toHaveBeenCalled();
  });

  it('classifies transient SMTP failures as retryable without exposing credentials', async () => {
    createTransport.mockReturnValue({
      sendMail: jest.fn().mockRejectedValue({ code: 'ETIMEDOUT' }),
      close: jest.fn(),
    });
    const adapter = new SmtpProviderAdapter(new CommunicationSecretResolver());

    await expect(adapter.send(request)).rejects.toMatchObject<Partial<CommunicationProviderError>>({
      code: 'ETIMEDOUT',
      retryable: true,
      message: 'SMTP delivery failed',
    });
  });
});
