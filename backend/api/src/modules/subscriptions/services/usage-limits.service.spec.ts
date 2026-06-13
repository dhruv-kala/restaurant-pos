import { ForbiddenException } from '@nestjs/common';
import {
  UsageCounterOperation,
  UsageCounterPeriod,
  UsageLimitAction,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TenantEntitlementsService } from './tenant-entitlements.service';
import { UsageLimitsService } from './usage-limits.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const counterId = '01975c30-0000-7000-8000-000000000200';
const featureKey = 'api.requests';
const now = new Date();

const actor: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'manager@example.com',
  name: 'Manager',
  tenantId,
  outletId: null,
  roles: ['MANAGER'],
};

const platformAdmin: AuthenticatedUser = {
  ...actor,
  tenantId: null,
  roles: ['SUPER_ADMIN'],
};

function entitlement(
  limitValue: number | null,
  metadata: Record<string, string> = {},
  enabled = true,
) {
  return {
    tenantId,
    featureKey,
    enabled,
    source: 'PLAN' as const,
    limitValue,
    metadata,
    subscription: null,
    override: null,
  };
}

function counter(value: bigint) {
  return {
    id: counterId,
    tenantId,
    featureKey,
    period: UsageCounterPeriod.LIFETIME,
    periodKey: 'LIFETIME',
    periodStart: new Date(0),
    periodEnd: null,
    usageValue: value,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function entitlementsWith(evaluation: object) {
  return {
    normalizeFeatureKey: jest.fn((value: string) => value),
    evaluateForTenantInTransaction: jest.fn().mockResolvedValue(evaluation),
  } as unknown as TenantEntitlementsService;
}

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

describe('UsageLimitsService', () => {
  it('evaluates a UTC daily counter from entitlement metadata', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      usageCounter: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new UsageLimitsService(
      transactionalPrisma(tx),
      entitlementsWith(
        entitlement(100, {
          usagePeriod: UsageCounterPeriod.DAILY,
          overLimitAction: UsageLimitAction.BLOCK,
        }),
      ),
      {} as AuditService,
    );

    const result = await service.evaluate(tenantId, featureKey, {
      ...actor,
      roles: ['TENANT_ADMIN'],
    });

    expect(result.period).toBe(UsageCounterPeriod.DAILY);
    expect(result.periodKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.usageValue).toBe('0');
    expect(result.remainingValue).toBe('100');
    expect(result.canConsume).toBe(true);
  });

  it('atomically consumes within the configured limit', async () => {
    const initial = counter(2n);
    const updated = { ...initial, usageValue: 3n, version: 2 };
    let eventData:
      | {
          operation: UsageCounterOperation;
          previousValue: bigint;
          currentValue: bigint;
          allowed: boolean;
        }
      | undefined;
    const createEvent = jest.fn(
      (input: {
        data: {
          operation: UsageCounterOperation;
          previousValue: bigint;
          currentValue: bigint;
          allowed: boolean;
        };
      }) => {
        eventData = input.data;
        return Promise.resolve({});
      },
    );
    const tx = {
      $queryRaw: jest.fn(),
      usageCounterEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createEvent,
      },
      usageCounter: {
        findUnique: jest.fn().mockResolvedValue(initial),
        update: jest.fn().mockResolvedValue(updated),
      },
    };
    const service = new UsageLimitsService(
      transactionalPrisma(tx),
      entitlementsWith(entitlement(5)),
      {} as AuditService,
    );

    const result = await service.consumeForActor(
      actor,
      featureKey,
      1,
      'api-request:1',
    );

    if ('bypassed' in result) throw new Error('Unexpected platform bypass');
    expect(result.usageValue).toBe('3');
    expect(result.overLimit).toBe(false);
    expect(tx.usageCounter.update).toHaveBeenCalledWith({
      where: {
        tenantId_id: {
          tenantId,
          id: counterId,
        },
      },
      data: {
        usageValue: 3n,
        version: { increment: 1 },
      },
    });
    expect(createEvent).toHaveBeenCalled();
    expect(eventData).toEqual(
      expect.objectContaining({
        operation: UsageCounterOperation.CONSUME,
        previousValue: 2n,
        currentValue: 3n,
        allowed: true,
      }),
    );
  });

  it('persists and audits a blocked over-limit decision', async () => {
    const initial = counter(5n);
    let eventData:
      | {
          currentValue: bigint;
          allowed: boolean;
          overLimit: boolean;
          limitAction: UsageLimitAction;
        }
      | undefined;
    const createEvent = jest.fn(
      (input: {
        data: {
          currentValue: bigint;
          allowed: boolean;
          overLimit: boolean;
          limitAction: UsageLimitAction;
        };
      }) => {
        eventData = input.data;
        return Promise.resolve({});
      },
    );
    const append = jest.fn().mockResolvedValue({});
    const tx = {
      $queryRaw: jest.fn(),
      usageCounterEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createEvent,
      },
      usageCounter: {
        findUnique: jest.fn().mockResolvedValue(initial),
        update: jest.fn(),
      },
      auditEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const service = new UsageLimitsService(
      transactionalPrisma(tx),
      entitlementsWith(entitlement(5)),
      { append } as unknown as AuditService,
    );

    await expect(
      service.consumeForActor(actor, featureKey, 1, 'api-request:blocked'),
    ).rejects.toThrow(ForbiddenException);

    expect(tx.usageCounter.update).not.toHaveBeenCalled();
    expect(createEvent).toHaveBeenCalled();
    expect(eventData).toEqual(
      expect.objectContaining({
        currentValue: 5n,
        allowed: false,
        overLimit: true,
        limitAction: UsageLimitAction.BLOCK,
      }),
    );
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'subscription.usage.denied',
        targetId: counterId,
      }),
    );
  });

  it('allows configured warning overages and records the decision', async () => {
    const initial = counter(5n);
    const updated = { ...initial, usageValue: 6n, version: 2 };
    const append = jest.fn().mockResolvedValue({});
    const tx = {
      $queryRaw: jest.fn(),
      usageCounterEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      usageCounter: {
        findUnique: jest.fn().mockResolvedValue(initial),
        update: jest.fn().mockResolvedValue(updated),
      },
    };
    const service = new UsageLimitsService(
      transactionalPrisma(tx),
      entitlementsWith(
        entitlement(5, { overLimitAction: UsageLimitAction.WARN }),
      ),
      { append } as unknown as AuditService,
    );

    const result = await service.consumeForActor(
      actor,
      featureKey,
      1,
      'api-request:warn',
    );

    if ('bypassed' in result) throw new Error('Unexpected platform bypass');
    expect(result.usageValue).toBe('6');
    expect(result.overLimit).toBe(true);
    expect(result.limitAction).toBe(UsageLimitAction.WARN);
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'subscription.usage.over_limit_allowed',
      }),
    );
  });

  it('reconciles a counter with immutable history and an audit event', async () => {
    const created = counter(4n);
    const append = jest.fn().mockResolvedValue({});
    const createEvent = jest.fn().mockResolvedValue({});
    const tx = {
      $queryRaw: jest.fn(),
      usageCounterEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createEvent,
      },
      usageCounter: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const service = new UsageLimitsService(
      transactionalPrisma(tx),
      entitlementsWith(entitlement(5)),
      { append } as unknown as AuditService,
    );

    const result = await service.adjust(
      tenantId,
      featureKey,
      {
        usageValue: '4',
        period: UsageCounterPeriod.LIFETIME,
        reason: 'Imported current allocation',
        idempotencyKey: 'usage:adjust:1',
      },
      platformAdmin,
      {},
    );

    expect(result.usageValue).toBe('4');
    expect(createEvent).toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'subscription.usage.adjusted',
        targetId: counterId,
        reason: 'Imported current allocation',
      }),
    );
  });
});
