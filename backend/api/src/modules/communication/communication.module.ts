import { Module } from '@nestjs/common';

import { CommunicationMessagesController } from './controllers/communication-messages.controller';
import { CommunicationTemplatesController } from './controllers/communication-templates.controller';
import { SmtpProviderAdapter } from './providers/smtp-provider.adapter';
import { TwilioSmsProviderAdapter } from './providers/twilio-sms-provider.adapter';
import { CommunicationAddressProtector } from './services/communication-address-protector';
import { CommunicationDeliveryExecutor } from './services/communication-delivery-executor.service';
import { CommunicationHistoryService } from './services/communication-history.service';
import { CommunicationSecretResolver } from './services/communication-secret-resolver';
import { CommunicationTemplateRenderer } from './services/communication-template-renderer';
import { CommunicationTemplatesService } from './services/communication-templates.service';
import { CommunicationService } from './services/communication.service';
import { EmailDeliveryService } from './services/email-delivery.service';
import { SmsDeliveryService } from './services/sms-delivery.service';

@Module({
  controllers: [CommunicationMessagesController, CommunicationTemplatesController],
  providers: [
    CommunicationAddressProtector,
    CommunicationDeliveryExecutor,
    CommunicationHistoryService,
    CommunicationSecretResolver,
    CommunicationService,
    CommunicationTemplateRenderer,
    CommunicationTemplatesService,
    EmailDeliveryService,
    SmsDeliveryService,
    SmtpProviderAdapter,
    TwilioSmsProviderAdapter,
  ],
  exports: [
    CommunicationAddressProtector,
    CommunicationDeliveryExecutor,
    CommunicationService,
    CommunicationTemplateRenderer,
    CommunicationTemplatesService,
    EmailDeliveryService,
    SmsDeliveryService,
  ],
})
export class CommunicationModule {}
