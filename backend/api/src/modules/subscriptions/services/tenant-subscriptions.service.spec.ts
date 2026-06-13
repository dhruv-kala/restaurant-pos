import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  SubscriptionBillingInterval,
  SubscriptionPlanStatus,
  TenantSubscriptionEventType,
  TenantSubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TenantSubscriptionsService } from './tenant-subscriptions.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const subscriptionId = '01975c30-0000-7000-8000-000000000200';
const planId = '01975c30-0000-7000-8000-000000000300';
const nextPlanId = '01975c30-0000-7000-8000-000000000301';

const actor: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'platform@example.com',
  name: 'Platform Admin',
  tenantId: null,
  outletId: null,
  roles: ['SUPER_ADMIN'],
};

function plan(id: string, versionNumber: number) {
  return {
    id,
    code: 'growth',
    versionNumber,
    name: 'Growth',
    description: null,
    billingInterval: SubscriptionBillingInterval.MONTHLY,
    priceMinor: 4999,
    currencyCode: 'USD',
    status: SubscriptionPlanStatus.ACTIVE,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
    activatedAt: new Date('2026-06-01T00:00:00.000Z'),
    deactivatedAt: null,
    version: 2,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    features: [],
  };
}

function subscription(
  selectedPlanId = planId,
  status: TenantSubscriptionStatus = TenantSubscriptionStatus.ACTIVE,
  version = 1,
) {
  return {
    id: subscriptionId,
    tenantId,
    planId: selectedPlanId,
    status,
    startsAt: new Date('2026-06-01T00:00:00.000Z'),
    endsAt: null,
    suspendedAt:
      status === TenantSubscriptionStatus.SUSPENDED ? new Date('2026-06-10T00:00:00.000Z') : null,
    expiredAt: null,
    cancelledAt: null,
    createdByUserId: actor.id,
    updatedByUserId: actor.id,
    version,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    plan: plan(selectedPlanId, selectedPlanId === planId ? 1 : 2),
  };
}

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

describe('TenantSubscriptionsService', () => {
  it('activates a tenant subscription and appends domain and audit history', async () => {
    const created = subscription();
    const appendAudit = jest.fn();
    let eventData:
      | {
          eventType: TenantSubscriptionEventType;
          previousStatus: TenantSubscriptionStatus | null;
          newStatus: TenantSubscriptionStatus;
          newPlanId: string;
        }
      | undefined;
    const createEvent = jest.fn(
      (arguments_: {
        data: {
          eventType: TenantSubscriptionEventType;
          previousStatus: TenantSubscriptionStatus | null;
          newStatus: TenantSubscriptionStatus;
          newPlanId: string;
        };
      }) => {
        eventData = arguments_.data;
        return Promise.resolve({});
      },
    );
    const tx = {
      $queryRaw: jest.fn(),
      tenantSubscriptionEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createEvent,
      },
      tenant: {
        findFirst: jest.fn().mockResolvedValue({ id: tenantId }),
      },
      subscriptionPlan: {
        findFirst: jest.fn().mockResolvedValue({ id: planId }),
      },
      tenantSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const service = new TenantSubscriptionsService(transactionalPrisma(tx), {
      append: appendAudit,
    } as unknown as AuditService);

    const result = await service.activate(
      tenantId,
      {
        planId,
        startsAt: '2026-06-01T00:00:00.000Z',
        idempotencyKey: 'activate:tenant:1',
      },
      actor,
      {},
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: subscriptionId,
        tenantId,
        status: TenantSubscriptionStatus.ACTIVE,
      }),
    );
    expect(eventData?.eventType).toBe(TenantSubscriptionEventType.ACTIVATED);
    expect(eventData?.previousStatus).toBeNull();
    expect(eventData?.newStatus).toBe(TenantSubscriptionStatus.ACTIVE);
    expect(eventData?.newPlanId).toBe(planId);
    expect(appendAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId,
        action: 'subscription.lifecycle.activated',
      }),
    );
  });

  it('changes an active subscription to an exact active plan version', async () => {
    const current = subscription();
    const updated = subscription(nextPlanId, TenantSubscriptionStatus.ACTIVE, 2);
    const tx = {
      $queryRaw: jest.fn(),
      tenantSubscriptionEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      tenantSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce(current).mockResolvedValueOnce(updated),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      subscriptionPlan: {
        findFirst: jest.fn().mockResolvedValue({ id: nextPlanId }),
      },
    };
    const service = new TenantSubscriptionsService(transactionalPrisma(tx), {
      append: jest.fn(),
    } as unknown as AuditService);

    const result = await service.upgrade(
      tenantId,
      subscriptionId,
      {
        planId: nextPlanId,
        version: 1,
        reason: 'More outlets',
        idempotencyKey: 'upgrade:tenant:1',
      },
      actor,
      {},
    );

    expect(tx.tenantSubscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: subscriptionId,
        tenantId,
        version: 1,
        status: TenantSubscriptionStatus.ACTIVE,
      },
      data: {
        planId: nextPlanId,
        updatedByUserId: actor.id,
        version: { increment: 1 },
      },
    });
    expect(result.version).toBe(2);
    expect(result.plan.id).toBe(nextPlanId);
  });

  it('rejects plan changes for suspended subscriptions', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      tenantSubscriptionEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      tenantSubscription: {
        findFirst: jest
          .fn()
          .mockResolvedValue(subscription(planId, TenantSubscriptionStatus.SUSPENDED)),
      },
    };
    const service = new TenantSubscriptionsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.downgrade(
        tenantId,
        subscriptionId,
        {
          planId: nextPlanId,
          version: 1,
          idempotencyKey: 'downgrade:tenant:1',
        },
        actor,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects reuse of an idempotency key for another command', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      tenantSubscriptionEvent: {
        findUnique: jest.fn().mockResolvedValue({
          subscriptionId,
          requestFingerprint: 'different',
        }),
      },
    };
    const service = new TenantSubscriptionsService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.suspend(
        tenantId,
        subscriptionId,
        {
          version: 1,
          idempotencyKey: 'used:key',
        },
        actor,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects future activation dates before persistence', async () => {
    const service = new TenantSubscriptionsService({} as PrismaService, {} as AuditService);

    await expect(
      service.activate(
        tenantId,
        {
          planId,
          startsAt: '2099-01-01T00:00:00.000Z',
          idempotencyKey: 'future:start',
        },
        actor,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
