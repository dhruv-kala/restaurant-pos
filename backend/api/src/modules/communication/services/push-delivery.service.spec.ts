import { CommunicationChannel, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CommunicationProviderError } from '../providers/communication-provider.adapter';
import type { FirebasePushProviderAdapter } from '../providers/firebase-push-provider.adapter';
import type {
  CommunicationDeliveryDefinition,
  CommunicationDeliveryExecutor,
} from './communication-delivery-executor.service';
import { PushDeliveryService } from './push-delivery.service';
import type { PushDevicesService } from './push-devices.service';

describe('PushDeliveryService', () => {
  it('delegates FCM delivery and deactivates invalid destinations through the failure hook', async () => {
    let definition: CommunicationDeliveryDefinition | undefined;
    const deliver = jest.fn(
      (
        _messageId: string,
        _actor: AuthenticatedUser,
        value: CommunicationDeliveryDefinition,
      ) => {
        definition = value;
        return Promise.resolve({ status: 'SENT' });
      },
    );
    const executor = { deliver } as unknown as CommunicationDeliveryExecutor;
    const firebase = {
      providerKey: 'firebase',
      channel: CommunicationChannel.PUSH,
      send: jest.fn(),
    } as unknown as FirebasePushProviderAdapter;
    const deactivateInvalidToken = jest.fn().mockResolvedValue(1);
    const devices = { deactivateInvalidToken } as unknown as PushDevicesService;
    const actor = {
      id: 'user-1',
      email: 'admin@example.test',
      name: 'Admin',
      tenantId: 'tenant-1',
      outletId: null,
      roles: ['TENANT_ADMIN'],
    } satisfies AuthenticatedUser;
    const service = new PushDeliveryService(executor, firebase, devices);

    await service.deliver('message-1', actor);
    expect(definition).toMatchObject({
      channel: CommunicationChannel.PUSH,
      auditChannel: 'push',
      adapter: firebase,
    });
    await definition?.onFailure?.({} as Prisma.TransactionClient, {
      tenantId: 'tenant-1',
      outletId: null,
      messageId: 'message-1',
      recipientAddressHash: 'a'.repeat(64),
      error: new CommunicationProviderError(
        'Invalid token',
        'FCM_TOKEN_UNREGISTERED',
        false,
        true,
      ),
      actor,
      request: {},
    });
    expect(deactivateInvalidToken).toHaveBeenCalledWith(expect.anything(), {
      tenantId: 'tenant-1',
      tokenHash: 'a'.repeat(64),
      reason: 'FCM_TOKEN_UNREGISTERED',
      actor,
      request: {},
    });
  });
});
