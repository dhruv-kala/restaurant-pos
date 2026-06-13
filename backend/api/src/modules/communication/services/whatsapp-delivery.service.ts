import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '@prisma/client';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { TwilioWhatsAppProviderAdapter } from '../providers/twilio-whatsapp-provider.adapter';
import { CommunicationDeliveryExecutor } from './communication-delivery-executor.service';

@Injectable()
export class WhatsAppDeliveryService {
  constructor(
    private readonly delivery: CommunicationDeliveryExecutor,
    private readonly twilio: TwilioWhatsAppProviderAdapter,
  ) {}

  deliver(
    messageId: string,
    actor: AuthenticatedUser,
    requestedTenantId?: string,
    request: AuditRequestMetadata = {},
  ) {
    return this.delivery.deliver(
      messageId,
      actor,
      {
        channel: CommunicationChannel.WHATSAPP,
        auditChannel: 'whatsapp',
        adapter: this.twilio,
      },
      requestedTenantId,
      request,
    );
  }
}
