import { Module } from '@nestjs/common';

import { CommunicationMessagesController } from './controllers/communication-messages.controller';
import { CommunicationAnalyticsController } from './controllers/communication-analytics.controller';
import { CommunicationProvidersController } from './controllers/communication-providers.controller';
import { CommunicationTemplatesController } from './controllers/communication-templates.controller';
import { CommunicationWebhooksController } from './controllers/communication-webhooks.controller';
import { PushDevicesController } from './controllers/push-devices.controller';
import { FirebaseAccessTokenProvider } from './providers/firebase-access-token.provider';
import { FirebasePushProviderAdapter } from './providers/firebase-push-provider.adapter';
import { CommunicationWebhookVerifier } from './providers/communication-webhook.verifier';
import { SmtpProviderAdapter } from './providers/smtp-provider.adapter';
import { TwilioMessagesClient } from './providers/twilio-messages.client';
import { TwilioSmsProviderAdapter } from './providers/twilio-sms-provider.adapter';
import { TwilioWhatsAppProviderAdapter } from './providers/twilio-whatsapp-provider.adapter';
import { CommunicationAddressProtector } from './services/communication-address-protector';
import { CommunicationAnalyticsService } from './services/communication-analytics.service';
import { CommunicationDeliveryExecutor } from './services/communication-delivery-executor.service';
import { CommunicationDeliveryStatusService } from './services/communication-delivery-status.service';
import { CommunicationHistoryService } from './services/communication-history.service';
import { CommunicationProvidersService } from './services/communication-providers.service';
import { CommunicationSecretResolver } from './services/communication-secret-resolver';
import { CommunicationTemplateRenderer } from './services/communication-template-renderer';
import { CommunicationWebhookNormalizer } from './services/communication-webhook-normalizer';
import { CommunicationWebhooksService } from './services/communication-webhooks.service';
import { CommunicationTemplatesService } from './services/communication-templates.service';
import { CommunicationService } from './services/communication.service';
import { EmailDeliveryService } from './services/email-delivery.service';
import { PushDeliveryService } from './services/push-delivery.service';
import { PushDevicesService } from './services/push-devices.service';
import { SmsDeliveryService } from './services/sms-delivery.service';
import { WhatsAppDeliveryService } from './services/whatsapp-delivery.service';
import { WhatsAppDeliveryStatusService } from './services/whatsapp-delivery-status.service';

@Module({
  controllers: [
    CommunicationAnalyticsController,
    CommunicationMessagesController,
    CommunicationProvidersController,
    CommunicationTemplatesController,
    CommunicationWebhooksController,
    PushDevicesController,
  ],
  providers: [
    CommunicationAddressProtector,
    CommunicationAnalyticsService,
    CommunicationDeliveryExecutor,
    CommunicationDeliveryStatusService,
    CommunicationHistoryService,
    CommunicationProvidersService,
    CommunicationSecretResolver,
    CommunicationService,
    CommunicationTemplateRenderer,
    CommunicationTemplatesService,
    CommunicationWebhookNormalizer,
    CommunicationWebhooksService,
    CommunicationWebhookVerifier,
    EmailDeliveryService,
    FirebaseAccessTokenProvider,
    FirebasePushProviderAdapter,
    PushDeliveryService,
    PushDevicesService,
    SmsDeliveryService,
    SmtpProviderAdapter,
    TwilioMessagesClient,
    TwilioSmsProviderAdapter,
    TwilioWhatsAppProviderAdapter,
    WhatsAppDeliveryService,
    WhatsAppDeliveryStatusService,
  ],
  exports: [
    CommunicationAddressProtector,
    CommunicationDeliveryExecutor,
    CommunicationService,
    CommunicationTemplateRenderer,
    CommunicationTemplatesService,
    EmailDeliveryService,
    PushDeliveryService,
    PushDevicesService,
    SmsDeliveryService,
    WhatsAppDeliveryService,
    WhatsAppDeliveryStatusService,
  ],
})
export class CommunicationModule {}
