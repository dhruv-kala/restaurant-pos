import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '@prisma/client';
import nodemailer from 'nodemailer';

import {
  CommunicationProviderError,
  type CommunicationProviderAdapter,
  type CommunicationProviderRequest,
  type CommunicationProviderResult,
} from './communication-provider.adapter';
import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

interface SmtpConfiguration {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
  rejectUnauthorized: boolean;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
}

@Injectable()
export class SmtpProviderAdapter implements CommunicationProviderAdapter {
  readonly providerKey = 'smtp';
  readonly channel = CommunicationChannel.EMAIL;

  constructor(private readonly secrets: CommunicationSecretResolver) {}

  async send(request: CommunicationProviderRequest): Promise<CommunicationProviderResult> {
    if (request.channel !== CommunicationChannel.EMAIL) {
      throw new CommunicationProviderError(
        'SMTP supports email messages only',
        'UNSUPPORTED_CHANNEL',
        false,
      );
    }
    if (!this.email(request.destination)) {
      throw new CommunicationProviderError(
        'Email recipient address is invalid',
        'EMAIL_RECIPIENT_INVALID',
        false,
      );
    }
    const configuration = this.configuration(request.configuration);
    const password = this.secrets.resolve(request.secretReference);
    if (configuration.username && !password) {
      throw new CommunicationProviderError(
        'SMTP credentials are unavailable',
        'SMTP_CREDENTIALS_UNAVAILABLE',
        false,
      );
    }

    const transport = nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      secure: configuration.secure,
      auth: configuration.username ? { user: configuration.username, pass: password } : undefined,
      tls: { rejectUnauthorized: configuration.rejectUnauthorized },
      connectionTimeout: configuration.connectionTimeoutMs,
      greetingTimeout: configuration.greetingTimeoutMs,
      socketTimeout: configuration.socketTimeoutMs,
    });

    try {
      const result = await transport.sendMail({
        from: configuration.fromName
          ? { name: configuration.fromName, address: configuration.fromAddress }
          : configuration.fromAddress,
        to: request.destination,
        replyTo: configuration.replyTo,
        subject: request.subject ?? undefined,
        text: request.body,
        headers: {
          'X-Communication-Message-Id': request.messageId,
        },
      });
      if (result.rejected.length > 0 || result.accepted.length === 0) {
        throw new CommunicationProviderError(
          'SMTP provider rejected the recipient',
          'SMTP_RECIPIENT_REJECTED',
          false,
        );
      }
      return {
        providerMessageId: result.messageId,
        acceptedAt: new Date(),
        metadata: {
          acceptedCount: result.accepted.length,
          rejectedCount: result.rejected.length,
          responseCode: this.responseCode(result.response),
        },
      };
    } catch (error) {
      if (error instanceof CommunicationProviderError) throw error;
      throw this.providerError(error);
    } finally {
      transport.close();
    }
  }

  private configuration(value: unknown): SmtpConfiguration {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw new CommunicationProviderError(
        'SMTP provider configuration is invalid',
        'SMTP_CONFIGURATION_INVALID',
        false,
      );
    }
    const input = value as Record<string, unknown>;
    const host = this.string(input.host);
    const port = this.integer(input.port, 1, 65535);
    const fromAddress = this.string(input.fromAddress);
    if (!host || !port || !fromAddress || !this.email(fromAddress)) {
      throw new CommunicationProviderError(
        'SMTP provider configuration is invalid',
        'SMTP_CONFIGURATION_INVALID',
        false,
      );
    }
    const username = this.optionalString(input.username);
    const replyTo = this.optionalString(input.replyTo);
    if (replyTo && !this.email(replyTo)) {
      throw new CommunicationProviderError(
        'SMTP reply-to address is invalid',
        'SMTP_CONFIGURATION_INVALID',
        false,
      );
    }
    return {
      host,
      port,
      secure: this.boolean(input.secure, port === 465),
      username,
      fromAddress,
      fromName: this.optionalString(input.fromName),
      replyTo,
      rejectUnauthorized: this.boolean(input.rejectUnauthorized, true),
      connectionTimeoutMs: this.integer(input.connectionTimeoutMs, 1000, 120000) ?? 10000,
      greetingTimeoutMs: this.integer(input.greetingTimeoutMs, 1000, 120000) ?? 10000,
      socketTimeoutMs: this.integer(input.socketTimeoutMs, 1000, 300000) ?? 30000,
    };
  }

  private providerError(error: unknown): CommunicationProviderError {
    const candidate =
      error !== null && typeof error === 'object'
        ? (error as Record<string, unknown>)
        : {};
    const code = typeof candidate.code === 'string' ? candidate.code : 'SMTP_SEND_FAILED';
    const responseCode =
      typeof candidate.responseCode === 'number' ? candidate.responseCode : undefined;
    const retryable =
      ['ETIMEDOUT', 'ECONNECTION', 'ECONNRESET', 'EAI_AGAIN', 'ESOCKET'].includes(code) ||
      (responseCode !== undefined && responseCode >= 400 && responseCode < 500);
    return new CommunicationProviderError('SMTP delivery failed', code, retryable);
  }

  private string(value: unknown): string | undefined {
    return typeof value === 'string' &&
      value.trim() &&
      !/[\r\n\0]/.test(value)
      ? value.trim()
      : undefined;
  }

  private optionalString(value: unknown): string | undefined {
    return value === undefined || value === null ? undefined : this.string(value);
  }

  private integer(value: unknown, minimum: number, maximum: number): number | undefined {
    return typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= minimum &&
      value <= maximum
      ? value
      : undefined;
  }

  private boolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private email(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private responseCode(response: string): number | undefined {
    const match = /^(\d{3})\b/.exec(response);
    return match ? Number(match[1]) : undefined;
  }
}
