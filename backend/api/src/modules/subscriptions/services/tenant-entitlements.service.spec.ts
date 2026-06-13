import { ForbiddenException } from '@nestjs/common';
import {
  SubscriptionBillingInterval,
  SubscriptionPlanStatus,
  TenantSubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TenantEntitlementsService } from './tenant-entitlements.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const featureKey = 'inventory';
const now = new Date();

const tenantAdmin: AuthenticatedUser = {
  id: '01975c30-0000-7000-8000-000000000001',
  email: 'admin@example.com',
  name: 'Tenant Admin',
  tenantId,
  outletId: null,
  roles: ['TENANT_ADMIN'],
};

const employee: AuthenticatedUser = {
  ...tenantAdmin,
  id: '01975c30-0000-7000-8000-000000000002',
  email: 'employee@example.com',
  roles: ['MANAGER'],
};

const platformAdmin: AuthenticatedUser = {
  ...tenantAdmin,
  tenantId: null,
  roles: ['SUPER_ADMIN'],
};

function subscription(featureEnabled = true) {
  return {
    id: '01975c30-0000-7000-8000-000000000200',
    tenantId,
    planId: '01975c30-0000-7000-8000-000000000300',
    status: TenantSubscriptionStatus.ACTIVE,
    startsAt: new Date(now.getTime() - 60_000),
    endsAt: null,
    suspendedAt: null,
    expiredAt: null,
    cancelledAt: null,
    createdByUserId: tenantAdmin.id,
    updatedByUserId: tenantAdmin.id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    plan: {
      id: '01975c30-0000-7000-8000-000000000300',
      code: 'growth',
      versionNumber: 1,
      name: 'Growth',
      description: null,
      billingInterval: SubscriptionBillingInterval.MONTHLY,
      priceMinor: 4999,
      currencyCode: 'USD',
      status: SubscriptionPlanStatus.ACTIVE,
      createdByUserId: tenantAdmin.id,
      updatedByUserId: tenantAdmin.id,
      activatedAt: now,
      deactivatedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
      features: [
        {
          id: '01975c30-0000-7000-8000-000000000400',
          planId: '01975c30-0000-7000-8000-000000000300',
          featureKey,
          isEnabled: featureEnabled,
          limitValue: 10,
          metadata: { unit: 'outlets' },
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
  };
}

function override(isEnabled: boolean) {
  return {
    id: '01975c30-0000-7000-8000-000000000500',
    tenantId,
    featureKey,
    isEnabled,
    limitValue: 3,
    metadata: { source: 'support' },
    reason: 'Temporary commercial override',
    effectiveFrom: new Date(now.getTime() - 60_000),
    effectiveTo: null,
    revokedAt: null,
    createdByUserId: tenantAdmin.id,
    updatedByUserId: tenantAdmin.id,
    lastIdempotencyKey: 'entitlement:1',
    lastRequestFingerprint: 'a'.repeat(64),
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: { id: tenantAdmin.id, displayName: tenantAdmin.name },
    updatedBy: { id: tenantAdmin.id, displayName: tenantAdmin.name },
  };
}

function serviceWith(currentSubscription: object | null, currentOverride: object | null) {
  const tx = {
    $queryRaw: jest.fn(),
    tenantSubscription: {
      findFirst: jest.fn().mockResolvedValue(currentSubscription),
    },
    tenantEntitlement: {
      findUnique: jest.fn().mockResolvedValue(currentOverride),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
  return new TenantEntitlementsService(prisma, {} as AuditService);
}

describe('TenantEntitlementsService evaluation', () => {
  it('uses the exact subscribed plan feature as the baseline', async () => {
    const result = await serviceWith(subscription(), null).evaluate(
      tenantId,
      featureKey,
      tenantAdmin,
    );

    expect(result).toEqual(
      expect.objectContaining({
        enabled: true,
        source: 'PLAN',
        limitValue: 10,
      }),
    );
  });

  it('gives an active tenant override precedence over the plan', async () => {
    const result = await serviceWith(subscription(), override(false)).evaluate(
      tenantId,
      featureKey,
      tenantAdmin,
    );

    expect(result).toEqual(
      expect.objectContaining({
        enabled: false,
        source: 'OVERRIDE',
        limitValue: 3,
      }),
    );
  });

  it('fails closed when no eligible subscription exists', async () => {
    const result = await serviceWith(null, override(true)).evaluate(
      tenantId,
      featureKey,
      tenantAdmin,
    );

    expect(result).toEqual(
      expect.objectContaining({
        enabled: false,
        source: 'SUBSCRIPTION_INELIGIBLE',
      }),
    );
  });

  it('enforces effective entitlements for ordinary tenant actors', async () => {
    await expect(
      serviceWith(subscription(), override(false)).requireForActor(employee, featureKey),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows platform administrators to bypass tenant feature gates', async () => {
    const result = await serviceWith(null, null).requireForActor(
      platformAdmin,
      featureKey,
    );

    expect(result.source).toBe('PLATFORM_BYPASS');
    expect(result.enabled).toBe(true);
  });

  it('creates an override and records its audit event', async () => {
    const created = override(true);
    const append = jest.fn();
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(created);
    const tx = {
      $queryRaw: jest.fn(),
      tenant: {
        findFirst: jest.fn().mockResolvedValue({ id: tenantId }),
      },
      tenantSubscription: {
        findFirst: jest.fn().mockResolvedValue(subscription()),
      },
      tenantEntitlement: {
        findUnique,
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    const service = new TenantEntitlementsService(prisma, {
      append,
    } as unknown as AuditService);

    const result = await service.upsert(
      tenantId,
      featureKey,
      {
        isEnabled: true,
        reason: 'Commercial approval',
        effectiveFrom: new Date(now.getTime() - 60_000).toISOString(),
        idempotencyKey: 'entitlement:create:1',
      },
      platformAdmin,
      {},
    );

    expect(result.source).toBe('OVERRIDE');
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId,
        action: 'subscription.entitlement.created',
        targetType: 'TenantEntitlement',
      }),
    );
  });
});
