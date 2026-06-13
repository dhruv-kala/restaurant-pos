import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, SubscriptionBillingInterval, SubscriptionPlanStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { SubscriptionPlansService } from './subscription-plans.service';

const actor: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'platform@example.com',
  name: 'Platform Admin',
  tenantId: null,
  outletId: null,
  roles: ['SUPER_ADMIN'],
};

const activePlan = {
  id: '01975c30-0000-7000-8000-000000000010',
  code: 'growth',
  versionNumber: 1,
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
  features: [
    {
      id: '01975c30-0000-7000-8000-000000000020',
      planId: '01975c30-0000-7000-8000-000000000010',
      featureKey: 'outlets',
      isEnabled: true,
      limitValue: 5,
      metadata: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    },
  ],
};

describe('SubscriptionPlansService', () => {
  it('creates a new draft version when an activated plan is updated', async () => {
    const draft = {
      ...activePlan,
      id: '01975c30-0000-7000-8000-000000000011',
      versionNumber: 2,
      name: 'Growth Plus',
      status: SubscriptionPlanStatus.DRAFT,
      activatedAt: null,
      version: 1,
    };
    let createArguments: Prisma.SubscriptionPlanCreateArgs | undefined;
    const createPlan = jest.fn((arguments_: Prisma.SubscriptionPlanCreateArgs) => {
      createArguments = arguments_;
      return Promise.resolve(draft);
    });
    const tx = {
      $queryRaw: jest.fn(),
      subscriptionPlan: {
        findUnique: jest.fn().mockResolvedValue(activePlan),
        aggregate: jest.fn().mockResolvedValue({ _max: { versionNumber: 1 } }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: createPlan,
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    const appendAudit = jest.fn();
    const audit = {
      append: appendAudit,
    } as unknown as AuditService;
    const service = new SubscriptionPlansService(prisma, audit);

    const result = await service.update(
      activePlan.id,
      { version: 2, name: 'Growth Plus' },
      actor,
      {},
    );

    expect(createPlan).toHaveBeenCalledTimes(1);
    expect(tx.subscriptionPlan.updateMany).toHaveBeenCalledWith({
      where: { id: activePlan.id, version: activePlan.version },
      data: {
        updatedByUserId: actor.id,
        version: { increment: 1 },
      },
    });
    expect(createArguments?.data).toEqual(
      expect.objectContaining({
        code: 'growth',
        versionNumber: 2,
        name: 'Growth Plus',
        features: {
          create: [
            expect.objectContaining({
              featureKey: 'outlets',
              limitValue: 5,
            }),
          ],
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: draft.id,
        versionNumber: 2,
        status: SubscriptionPlanStatus.DRAFT,
      }),
    );
    expect(appendAudit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: null,
        action: 'subscription.plan.version_created',
      }),
    );
  });

  it('rejects feature replacement on an activated plan version', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      subscriptionPlan: {
        findUnique: jest.fn().mockResolvedValue(activePlan),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    const service = new SubscriptionPlansService(prisma, {} as AuditService);

    await expect(
      service.replaceFeatures(
        activePlan.id,
        {
          version: activePlan.version,
          features: [
            {
              featureKey: 'reports',
              isEnabled: true,
            },
          ],
        },
        actor,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects duplicate normalized feature keys', async () => {
    const service = new SubscriptionPlansService({} as PrismaService, {} as AuditService);

    await expect(
      service.create(
        {
          code: 'starter',
          name: 'Starter',
          billingInterval: SubscriptionBillingInterval.MONTHLY,
          priceMinor: 999,
          currencyCode: 'USD',
          features: [
            { featureKey: 'reports', isEnabled: true },
            { featureKey: 'REPORTS', isEnabled: true },
          ],
        },
        actor,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses JSON null for cloned feature metadata', () => {
    const service = new SubscriptionPlansService({} as PrismaService, {} as AuditService);
    const featureData = service as unknown as {
      featureData(value: { featureKey: string; isEnabled: boolean }): { metadata: unknown };
    };

    expect(featureData.featureData({ featureKey: 'reports', isEnabled: true })).toEqual(
      expect.objectContaining({ metadata: Prisma.JsonNull }),
    );
  });
});
