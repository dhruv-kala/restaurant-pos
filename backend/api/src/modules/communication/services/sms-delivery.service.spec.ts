import { CommunicationChannel } from '@prisma/client';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { TwilioSmsProviderAdapter } from '../providers/twilio-sms-provider.adapter';
import type { CommunicationDeliveryExecutor } from './communication-delivery-executor.service';
import { SmsDeliveryService } from './sms-delivery.service';

describe('SmsDeliveryService', () => {
  it('delegates SMS delivery to the shared executor', async () => {
    const deliver = jest.fn().mockResolvedValue({ status: 'SENT' });
    const executor = { deliver } as unknown as CommunicationDeliveryExecutor;
    const twilio = {
      providerKey: 'twilio',
      channel: CommunicationChannel.SMS,
      send: jest.fn(),
    } as unknown as TwilioSmsProviderAdapter;
    const actor = {
      id: 'user-1',
      email: 'admin@example.test',
      name: 'Admin',
      tenantId: 'tenant-1',
      outletId: null,
      roles: ['TENANT_ADMIN'],
    } satisfies AuthenticatedUser;

    await expect(
      new SmsDeliveryService(executor, twilio).deliver('message-1', actor),
    ).resolves.toEqual({ status: 'SENT' });
    expect(deliver).toHaveBeenCalledWith(
      'message-1',
      actor,
      {
        channel: CommunicationChannel.SMS,
        auditChannel: 'sms',
        adapter: twilio,
      },
      undefined,
      {},
    );
  });
});
