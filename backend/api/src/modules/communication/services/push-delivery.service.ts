import { Injectable } from '@nestjs/common';
import { CommunicationChannel } from '@prisma/client';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { FirebasePushProviderAdapter } from '../providers/firebase-push-provider.adapter';
import { CommunicationDeliveryExecutor } from './communication-delivery-executor.service';
import { PushDevicesService } from './push-devices.service';

@Injectable()
export class PushDeliveryService {
  constructor(
    private readonly delivery: CommunicationDeliveryExecutor,
    private readonly firebase: FirebasePushProviderAdapter,
    private readonly devices: PushDevicesService,
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
        channel: CommunicationChannel.PUSH,
        auditChannel: 'push',
        adapter: this.firebase,
        onFailure: async (transaction, context) => {
          if (!context.error.invalidDestination) return;
          await this.devices.deactivateInvalidToken(transaction, {
            tenantId: context.tenantId,
            tokenHash: context.recipientAddressHash,
            reason: context.error.code,
            actor: context.actor,
            request: context.request,
          });
        },
      },
      requestedTenantId,
      request,
    );
  }
}
