import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '@prisma/client';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { TwilioSmsProviderAdapter } from '../providers/twilio-sms-provider.adapter';
import { CommunicationDeliveryExecutor } from './communication-delivery-executor.service';

@Injectable()
export class SmsDeliveryService {
  constructor(
    private readonly delivery: CommunicationDeliveryExecutor,
    private readonly twilio: TwilioSmsProviderAdapter,
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
        channel: CommunicationChannel.SMS,
        auditChannel: 'sms',
        adapter: this.twilio,
      },
      requestedTenantId,
      request,
    );
  }
}
