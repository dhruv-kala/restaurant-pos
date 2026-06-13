import { CommunicationChannel } from '@prisma/client';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { TwilioWhatsAppProviderAdapter } from '../providers/twilio-whatsapp-provider.adapter';
import type { CommunicationDeliveryExecutor } from './communication-delivery-executor.service';
import { WhatsAppDeliveryService } from './whatsapp-delivery.service';

describe('WhatsAppDeliveryService', () => {
  it('delegates WhatsApp delivery to the shared executor', async () => {
    const deliver = jest.fn().mockResolvedValue({ status: 'SENT' });
    const executor = { deliver } as unknown as CommunicationDeliveryExecutor;
    const twilio = {
      providerKey: 'twilio',
      channel: CommunicationChannel.WHATSAPP,
      send: jest.fn(),
    } as unknown as TwilioWhatsAppProviderAdapter;
    const actor = {
      id: 'user-1',
      email: 'admin@example.test',
      name: 'Admin',
      tenantId: 'tenant-1',
      outletId: null,
      roles: ['TENANT_ADMIN'],
    } satisfies AuthenticatedUser;

    await expect(
      new WhatsAppDeliveryService(executor, twilio).deliver('message-1', actor),
    ).resolves.toEqual({ status: 'SENT' });
    expect(deliver).toHaveBeenCalledWith(
      'message-1',
      actor,
      {
        channel: CommunicationChannel.WHATSAPP,
        auditChannel: 'whatsapp',
        adapter: twilio,
      },
      undefined,
      {},
    );
  });
});
