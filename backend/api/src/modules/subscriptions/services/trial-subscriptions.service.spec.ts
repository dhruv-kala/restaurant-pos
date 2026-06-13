import {
  SubscriptionBillingInterval,
  SubscriptionPlanStatus,
  TenantSubscriptionEventType,
  TenantSubscriptionStatus,
  TrialSubscriptionEventType,
  TrialSubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TrialSubscriptionsService } from './trial-subscriptions.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const trialId = '01975c30-0000-7000-8000-000000000200';
const subscriptionId = '01975c30-0000-7000-8000-000000000300';
const planId = '01975c30-0000-7000-8000-000000000400';
const paidPlanId = '01975c30-0000-7000-8000-000000000401';
const startsAt = new Date('2026-06-01T00:00:00.000Z');
const endsAt = new Date('2099-06-15T00:00:00.000Z');

const actor: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'platform@example.com',
  name: 'Platform Admin',
  tenantId: null,
  outletId: null,
  roles: ['SUPER_ADMIN'],
};

function plan(id = planId) {
  return {
    id,
    code: id === planId ? 'trial' : 'growth',
    versionNumber: 1,
    name: id === planId ? 'Trial' : 'Growth',
    description: null,
    billingInterval: SubscriptionBillingInterval.MONTHLY,
    priceMinor: id === planId ? 0 : 4999,
    currencyCode: 'USD',
    status: SubscriptionPlanStatus.ACTIVE,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
    activatedAt: startsAt,
    deactivatedAt: null,
    version: 1,
    createdAt: startsAt,
    updatedAt: startsAt,
    features: [],
  };
}

function subscription(
  status: TenantSubscriptionStatus = TenantSubscriptionStatus.TRIAL,
  selectedPlanId = planId,
) {
  return {
    id: subscriptionId,
    tenantId,
    planId: selectedPlanId,
    status,
    startsAt,
    endsAt: status === TenantSubscriptionStatus.ACTIVE ? null : endsAt,
    suspendedAt: null,
    expiredAt: status === TenantSubscriptionStatus.EXPIRED ? endsAt : null,
    cancelledAt: null,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
    version: 1,
    createdAt: startsAt,
    updatedAt: startsAt,
    plan: plan(selectedPlanId),
  };
}

function trial(
  status: TrialSubscriptionStatus = TrialSubscriptionStatus.ACTIVE,
  selectedPlanId = planId,
) {
  return {
    id: trialId,
    tenantId,
    subscriptionId,
    planId,
    convertedPlanId: status === TrialSubscriptionStatus.CONVERTED ? selectedPlanId : null,
    status,
    startsAt,
    endsAt,
    extendedCount: status === TrialSubscriptionStatus.ACTIVE ? 0 : 1,
    expiredAt: status === TrialSubscriptionStatus.EXPIRED ? endsAt : null,
    convertedAt: status === TrialSubscriptionStatus.CONVERTED ? endsAt : null,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
    version: 1,
    createdAt: startsAt,
    updatedAt: startsAt,
    plan: plan(planId),
    convertedPlan:
      status === TrialSubscriptionStatus.CONVERTED ? plan(selectedPlanId) : null,
    subscription: subscription(
      status === TrialSubscriptionStatus.CONVERTED
        ? TenantSubscriptionStatus.ACTIVE
        : status === TrialSubscriptionStatus.EXPIRED
          ? TenantSubscriptionStatus.EXPIRED
          : TenantSubscriptionStatus.TRIAL,
      selectedPlanId,
    ),
  };
}

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

describe('TrialSubscriptionsService', () => {
  it('starts a trial subscription with trial and subscription history', async () => {
    const appendAudit = jest.fn();
    let subscriptionEvent:
      | {
          eventType: TenantSubscriptionEventType;
          newStatus: TenantSubscriptionStatus;
        }
      | undefined;
    let trialEvent:
      | {
          eventType: TrialSubscriptionEventType;
          newStatus: TrialSubscriptionStatus;
        }
      | undefined;
    const tx = {
      $queryRaw: jest.fn(),
      trialSubscriptionEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn((input: { data: typeof trialEvent }) => {
          trialEvent = input.data;
          return Promise.resolve({});
        }),
      },
      tenantSubscriptionEvent: {
        create: jest.fn(
          (input: { data: typeof subscriptionEvent }) => {
            subscriptionEvent = input.data;
            return Promise.resolve({});
          },
        ),
      },
      tenant: {
        findFirst: jest.fn().mockResolvedValue({ id: tenantId }),
      },
      subscriptionPlan: {
        findFirst: jest.fn().mockResolvedValue({ id: planId }),
      },
      trialSubscription: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(trial()),
      },
      tenantSubscription: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(subscription()),
      },
    };
    const service = new TrialSubscriptionsService(transactionalPrisma(tx), {
      append: appendAudit,
    } as unknown as AuditService);

    const result = await service.start(
      tenantId,
      {
        planId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        idempotencyKey: 'trial:start:1',
      },
      actor,
      {},
    );

    expect(result.status).toBe(TrialSubscriptionStatus.ACTIVE);
    expect(subscriptionEvent?.eventType).toBe(TenantSubscriptionEventType.TRIAL_STARTED);
    expect(subscriptionEvent?.newStatus).toBe(TenantSubscriptionStatus.TRIAL);
    expect(trialEvent?.eventType).toBe(TrialSubscriptionEventType.STARTED);
    expect(trialEvent?.newStatus).toBe(TrialSubscriptionStatus.ACTIVE);
    expect(appendAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId,
        action: 'subscription.trial.started',
      }),
    );
  });

  it('extends an active trial and updates the linked subscription end', async () => {
    const current = trial();
    const extended = {
      ...current,
      endsAt: new Date('2099-06-30T00:00:00.000Z'),
      extendedCount: 1,
      version: 2,
      subscription: {
        ...current.subscription,
        endsAt: new Date('2099-06-30T00:00:00.000Z'),
      },
    };
    let trialUpdate:
      | {
          where: object;
          data: {
            endsAt?: Date;
            extendedCount?: { increment: number };
          };
        }
      | undefined;
    let subscriptionUpdate:
      | {
          where: object;
          data: {
            endsAt?: Date;
          };
        }
      | undefined;
    const tx = {
      $queryRaw: jest.fn(),
      trialSubscriptionEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      tenantSubscriptionEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      trialSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce(current).mockResolvedValueOnce(extended),
        updateMany: jest.fn((args: NonNullable<typeof trialUpdate>) => {
          trialUpdate = args;
          return Promise.resolve({ count: 1 });
        }),
      },
      tenantSubscription: {
        update: jest.fn((args: NonNullable<typeof subscriptionUpdate>) => {
          subscriptionUpdate = args;
          return Promise.resolve({});
        }),
      },
    };
    const service = new TrialSubscriptionsService(transactionalPrisma(tx), {
      append: jest.fn(),
    } as unknown as AuditService);

    const result = await service.extend(
      tenantId,
      trialId,
      {
        endsAt: '2099-06-30T00:00:00.000Z',
        version: 1,
        idempotencyKey: 'trial:extend:1',
      },
      actor,
      {},
    );

    expect(result.endsAt).toEqual(new Date('2099-06-30T00:00:00.000Z'));
    expect(trialUpdate?.where).toEqual({
        id: trialId,
        tenantId,
        version: 1,
        status: TrialSubscriptionStatus.ACTIVE,
    });
    expect(trialUpdate?.data.endsAt).toEqual(new Date('2099-06-30T00:00:00.000Z'));
    expect(trialUpdate?.data.extendedCount).toEqual({ increment: 1 });
    expect(subscriptionUpdate?.where).toEqual({ tenantId_id: { tenantId, id: subscriptionId } });
    expect(subscriptionUpdate?.data.endsAt).toEqual(new Date('2099-06-30T00:00:00.000Z'));
  });

  it('converts a trial to an active paid subscription', async () => {
    const current = trial();
    const converted = trial(TrialSubscriptionStatus.CONVERTED, paidPlanId);
    let subscriptionUpdate:
      | {
          where: object;
          data: {
            status?: TenantSubscriptionStatus;
            planId?: string;
            endsAt?: Date | null;
          };
        }
      | undefined;
    const tx = {
      $queryRaw: jest.fn(),
      trialSubscriptionEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      tenantSubscriptionEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      subscriptionPlan: {
        findFirst: jest.fn().mockResolvedValue({ id: paidPlanId }),
      },
      trialSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce(current).mockResolvedValueOnce(converted),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      tenantSubscription: {
        update: jest.fn((args: NonNullable<typeof subscriptionUpdate>) => {
          subscriptionUpdate = args;
          return Promise.resolve({});
        }),
      },
    };
    const service = new TrialSubscriptionsService(transactionalPrisma(tx), {
      append: jest.fn(),
    } as unknown as AuditService);

    const result = await service.convert(
      tenantId,
      trialId,
      {
        planId: paidPlanId,
        version: 1,
        idempotencyKey: 'trial:convert:1',
      },
      actor,
      {},
    );

    expect(result.status).toBe(TrialSubscriptionStatus.CONVERTED);
    expect(result.subscription.status).toBe(TenantSubscriptionStatus.ACTIVE);
    expect(subscriptionUpdate?.where).toEqual({ tenantId_id: { tenantId, id: subscriptionId } });
    expect(subscriptionUpdate?.data.status).toBe(TenantSubscriptionStatus.ACTIVE);
    expect(subscriptionUpdate?.data.planId).toBe(paidPlanId);
    expect(subscriptionUpdate?.data.endsAt).toBeNull();
  });

  it('expires due active trials through the platform processor', async () => {
    const current = trial();
    const expired = trial(TrialSubscriptionStatus.EXPIRED);
    let trialUpdate:
      | {
          where: object;
          data: {
            status?: TrialSubscriptionStatus;
          };
        }
      | undefined;
    const tx = {
      $queryRaw: jest.fn(),
      trialSubscription: {
        findMany: jest.fn().mockResolvedValue([current]),
        findFirst: jest.fn().mockResolvedValue(expired),
        updateMany: jest.fn((args: NonNullable<typeof trialUpdate>) => {
          trialUpdate = args;
          return Promise.resolve({ count: 1 });
        }),
      },
      trialSubscriptionEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      tenantSubscription: {
        update: jest.fn().mockResolvedValue({}),
      },
      tenantSubscriptionEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new TrialSubscriptionsService(transactionalPrisma(tx), {
      append: jest.fn(),
    } as unknown as AuditService);

    const result = await service.expireDue(
      {
        asOf: '2099-06-16T00:00:00.000Z',
        idempotencyKey: 'trial-expire-due',
      },
      actor,
      {},
    );

    expect(result.processed).toBe(1);
    expect(result.expired).toBe(1);
    expect(trialUpdate?.where).toEqual({
        id: trialId,
        tenantId,
        status: TrialSubscriptionStatus.ACTIVE,
    });
    expect(trialUpdate?.data.status).toBe(TrialSubscriptionStatus.EXPIRED);
  });
});
