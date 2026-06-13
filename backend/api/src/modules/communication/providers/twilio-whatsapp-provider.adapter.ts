import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '@prisma/client';

import {
  CommunicationProviderError,
  type CommunicationProviderAdapter,
  type CommunicationProviderRequest,
  type CommunicationProviderResult,
} from './communication-provider.adapter';
import { TwilioMessagesClient } from './twilio-messages.client';
import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

interface ApprovedTwilioTemplate {
  contentSid: string;
  variableNames?: string[];
}

interface TwilioWhatsAppConfiguration {
  accountSid: string;
  fromNumber?: string;
  messagingServiceSid?: string;
  timeoutMs: number;
  approvedTemplates: Record<string, ApprovedTwilioTemplate>;
}

@Injectable()
export class TwilioWhatsAppProviderAdapter implements CommunicationProviderAdapter {
  readonly providerKey = 'twilio';
  readonly channel = CommunicationChannel.WHATSAPP;

  constructor(
    private readonly secrets: CommunicationSecretResolver,
    private readonly client: TwilioMessagesClient,
  ) {}

  async send(request: CommunicationProviderRequest): Promise<CommunicationProviderResult> {
    if (request.channel !== CommunicationChannel.WHATSAPP) {
      throw new CommunicationProviderError(
        'Twilio WhatsApp supports WhatsApp messages only',
        'UNSUPPORTED_CHANNEL',
        false,
      );
    }
    if (!this.e164(request.destination)) {
      throw new CommunicationProviderError(
        'WhatsApp recipient must use E.164 format',
        'WHATSAPP_RECIPIENT_INVALID',
        false,
      );
    }
    if (!request.templateId || !request.templateVersionId) {
      throw new CommunicationProviderError(
        'WhatsApp delivery requires an immutable template version',
        'WHATSAPP_TEMPLATE_REQUIRED',
        false,
      );
    }

    const configuration = this.configuration(request.configuration);
    const approvedTemplate = configuration.approvedTemplates[request.templateVersionId];
    if (!approvedTemplate) {
      throw new CommunicationProviderError(
        'WhatsApp template version is not approved for this provider',
        'WHATSAPP_TEMPLATE_NOT_APPROVED',
        false,
      );
    }
    const variables = this.variables(request.metadata, approvedTemplate.variableNames);
    const authToken = this.secrets.resolve(request.secretReference);
    if (!authToken) {
      throw new CommunicationProviderError(
        'Twilio credentials are unavailable',
        'TWILIO_CREDENTIALS_UNAVAILABLE',
        false,
      );
    }

    const form = new URLSearchParams({
      To: `whatsapp:${request.destination}`,
      ContentSid: approvedTemplate.contentSid,
      ContentRetention: 'discard',
      AddressRetention: 'obfuscate',
    });
    if (Object.keys(variables).length > 0) {
      form.set('ContentVariables', JSON.stringify(variables));
    }
    if (configuration.fromNumber) {
      form.set('From', `whatsapp:${configuration.fromNumber}`);
    } else {
      form.set('MessagingServiceSid', configuration.messagingServiceSid!);
    }

    const payload = await this.client.send(
      configuration.accountSid,
      authToken,
      configuration.timeoutMs,
      form,
      'WhatsApp',
    );
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
        'Twilio reported immediate WhatsApp failure',
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
        contentSid: approvedTemplate.contentSid,
      },
    };
  }

  private configuration(value: unknown): TwilioWhatsAppConfiguration {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw this.invalidConfiguration();
    }
    const input = value as Record<string, unknown>;
    const accountSid = this.string(input.accountSid);
    const fromNumber = this.string(input.fromNumber);
    const messagingServiceSid = this.string(input.messagingServiceSid);
    const approvedTemplates = this.approvedTemplates(input.approvedTemplates);
    if (
      !accountSid ||
      !/^AC[0-9a-fA-F]{32}$/.test(accountSid) ||
      Boolean(fromNumber) === Boolean(messagingServiceSid) ||
      (fromNumber !== undefined && !this.e164(fromNumber)) ||
      (messagingServiceSid !== undefined && !/^MG[0-9a-fA-F]{32}$/.test(messagingServiceSid)) ||
      Object.keys(approvedTemplates).length === 0
    ) {
      throw this.invalidConfiguration();
    }
    return {
      accountSid,
      fromNumber,
      messagingServiceSid,
      timeoutMs: this.integer(input.timeoutMs, 1000, 120000) ?? 15000,
      approvedTemplates,
    };
  }

  private approvedTemplates(value: unknown): Record<string, ApprovedTwilioTemplate> {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw this.invalidConfiguration();
    }
    const templates: Record<string, ApprovedTwilioTemplate> = {};
    for (const [versionId, rawTemplate] of Object.entries(value)) {
      if (
        !this.uuid(versionId) ||
        !rawTemplate ||
        Array.isArray(rawTemplate) ||
        typeof rawTemplate !== 'object'
      ) {
        throw this.invalidConfiguration();
      }
      const template = rawTemplate as Record<string, unknown>;
      const contentSid = this.string(template.contentSid);
      const variableNames = this.variableNames(template.variableNames);
      if (!contentSid || !/^HX[0-9a-fA-F]{32}$/.test(contentSid)) {
        throw this.invalidConfiguration();
      }
      templates[versionId] = { contentSid, ...(variableNames ? { variableNames } : {}) };
    }
    return templates;
  }

  private variableNames(value: unknown): string[] | undefined {
    if (value === undefined) return undefined;
    const names = Array.isArray(value) ? (value as unknown[]) : null;
    if (
      !names ||
      names.length > 100 ||
      names.some((item) => typeof item !== 'string' || !/^[A-Za-z0-9_]{1,80}$/.test(item)) ||
      new Set(names).size !== names.length
    ) {
      throw this.invalidConfiguration();
    }
    return names.map((item) => item as string);
  }

  private variables(
    metadata: unknown,
    approvedNames: string[] | undefined,
  ): Record<string, string> {
    const raw =
      metadata && !Array.isArray(metadata) && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>).whatsappVariables
        : undefined;
    if (raw === undefined) {
      if (approvedNames?.length) {
        throw new CommunicationProviderError(
          'WhatsApp template variables do not match the approved template',
          'WHATSAPP_TEMPLATE_VARIABLES_INVALID',
          false,
        );
      }
      return {};
    }
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
      throw this.invalidVariables();
    }
    const variables = Object.create(null) as Record<string, string>;
    for (const [key, value] of Object.entries(raw)) {
      if (
        !/^[A-Za-z0-9_]{1,80}$/.test(key) ||
        !['string', 'number', 'boolean'].includes(typeof value)
      ) {
        throw this.invalidVariables();
      }
      const normalized = String(value);
      if (!normalized || normalized.length > 1000 || /[\0]/.test(normalized)) {
        throw this.invalidVariables();
      }
      variables[key] = normalized;
    }
    if (
      approvedNames &&
      (approvedNames.length !== Object.keys(variables).length ||
        approvedNames.some((name) => !Object.hasOwn(variables, name)))
    ) {
      throw this.invalidVariables();
    }
    return variables;
  }

  private invalidVariables(): CommunicationProviderError {
    return new CommunicationProviderError(
      'WhatsApp template variables do not match the approved template',
      'WHATSAPP_TEMPLATE_VARIABLES_INVALID',
      false,
    );
  }

  private invalidConfiguration(): CommunicationProviderError {
    return new CommunicationProviderError(
      'Twilio WhatsApp provider configuration is invalid',
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

  private uuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
