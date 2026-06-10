import { ForbiddenException } from '@nestjs/common';
import { OutletStatus, TenantStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { OutletsService } from './outlets.service';

describe('OutletsService', () => {
  const tenantId = '01975f6f-b03d-7ac2-893f-c7e858a42ff2';
  const otherTenantId = '01975f6f-b03d-7ac2-893f-c7e858a42ff3';
  const tenantAdmin: AuthenticatedUser = {
    id: 'user-id',
    email: 'admin@example.com',
    name: 'Admin User',
    tenantId,
    outletId: null,
    roles: ['TENANT_ADMIN'],
  };
  const manager: AuthenticatedUser = {
    ...tenantAdmin,
    roles: ['MANAGER'],
  };
  let transaction: {
    $queryRaw: jest.Mock;
    tenant: { findFirst: jest.Mock };
    outlet: {
      count: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: OutletsService;
  let createdOutletTenantId: string | undefined;

  beforeEach(() => {
    createdOutletTenantId = undefined;
    transaction = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      tenant: { findFirst: jest.fn() },
      outlet: {
        count: jest.fn(),
        create: jest.fn().mockImplementation(
          (args: { data: { tenantId: string } }) => {
            createdOutletTenantId = args.data.tenantId;
            return Promise.resolve({
              id: 'outlet-id',
              tenantId: args.data.tenantId,
              name: 'Second Outlet',
              code: 'SECOND',
              email: null,
              phone: null,
              addressLine1: null,
              addressLine2: null,
              city: null,
              state: null,
              country: null,
              postalCode: null,
              timezone: 'Asia/Kolkata',
              status: OutletStatus.ACTIVE,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          },
        ),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    service = new OutletsService(prisma as unknown as PrismaService);
  });

  it('blocks cross-tenant outlet filters for tenant users', async () => {
    await expect(
      service.findAll(
        { page: 1, limit: 20, tenantId: otherTenantId },
        manager,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow managers to create outlets', async () => {
    await expect(
      service.create({ name: 'Manager Outlet' }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enforces the tenant outlet subscription limit', async () => {
    transaction.tenant.findFirst.mockResolvedValue({
      id: tenantId,
      status: TenantStatus.ACTIVE,
      outletLimit: 1,
      timezone: 'Asia/Kolkata',
    });
    transaction.outlet.count.mockResolvedValue(1);

    await expect(
      service.create({ name: 'Second Outlet' }, tenantAdmin),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'Outlet limit reached for current subscription plan',
      }),
    );
    expect(transaction.outlet.create).not.toHaveBeenCalled();
  });

  it('creates an outlet inside the JWT tenant when below the limit', async () => {
    transaction.tenant.findFirst.mockResolvedValue({
      id: tenantId,
      status: TenantStatus.ACTIVE,
      outletLimit: 2,
      timezone: 'Asia/Kolkata',
    });
    transaction.outlet.count.mockResolvedValue(1);
    const result = await service.create(
      { name: 'Second Outlet', code: 'SECOND' },
      tenantAdmin,
    );

    expect(result.tenantId).toBe(tenantId);
    expect(createdOutletTenantId).toBe(tenantId);
  });
});
