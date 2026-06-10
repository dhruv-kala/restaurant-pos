import { ForbiddenException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
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
  const superAdmin: AuthenticatedUser = {
    ...tenantAdmin,
    tenantId: null,
    roles: ['SUPER_ADMIN'],
  };
  let transaction: {
    $queryRaw: jest.Mock;
    tenant: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: TenantsService;
  let tenantListWhere: { id?: string } | undefined;

  beforeEach(() => {
    tenantListWhere = undefined;
    transaction = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      tenant: {
        create: jest.fn(),
        findMany: jest.fn().mockImplementation(
          (args: { where: { id?: string } }) => {
            tenantListWhere = args.where;
            return Promise.resolve([]);
          },
        ),
        count: jest.fn(),
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
    service = new TenantsService(prisma as unknown as PrismaService);
  });

  it('blocks tenant administrators from another tenant', async () => {
    await expect(service.findOne(otherTenantId, tenantAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(transaction.tenant.findFirst).not.toHaveBeenCalled();
  });

  it('scopes tenant-admin list queries to the JWT tenant', async () => {
    transaction.tenant.count.mockResolvedValue(0);

    await expect(
      service.findAll({ page: 1, limit: 20 }, tenantAdmin),
    ).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    expect(tenantListWhere?.id).toBe(tenantId);
  });

  it('allows platform administrators to create tenants', async () => {
    const createdAt = new Date();
    transaction.tenant.create.mockResolvedValue({
      id: tenantId,
      slug: 'new-tenant',
      name: 'New Tenant',
      legalName: null,
      email: null,
      phone: null,
      status: TenantStatus.ACTIVE,
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
      outletLimit: 2,
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.create(
      { name: 'New Tenant', slug: 'new-tenant', outletLimit: 2 },
      superAdmin,
    );

    expect(result.id).toBe(tenantId);
    expect(transaction.tenant.create).toHaveBeenCalled();
  });
});
