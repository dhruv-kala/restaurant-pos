import { ConflictException, ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const tenantId = '01975f6f-b03d-7ac2-893f-c7e858a42ff2';
  const tenantAdmin: AuthenticatedUser = {
    id: 'user-id',
    email: 'admin@example.com',
    name: 'Admin',
    tenantId,
    outletId: null,
    roles: ['TENANT_ADMIN'],
  };
  const cashier: AuthenticatedUser = {
    ...tenantAdmin,
    roles: ['CASHIER'],
  };
  const transaction = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    menuCategory: {
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    menuItem: { count: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };
  const service = new CategoriesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.$queryRaw.mockResolvedValue([]);
  });

  it('denies cashier category management', async () => {
    await expect(service.create({ name: 'Starters' }, cashier)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('creates categories only in the JWT tenant', async () => {
    transaction.menuCategory.create.mockImplementation(
      ({ data }: { data: { tenantId: string; name: string } }) =>
        Promise.resolve({
          id: 'category-id',
          tenantId: data.tenantId,
          parentId: null,
          name: data.name,
          description: null,
          displayOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    );

    const result: {
      tenantId: string;
    } = await service.create({ name: 'Starters' }, tenantAdmin);

    expect(result.tenantId).toBe(tenantId);
    expect(transaction.menuCategory.create).toHaveBeenCalledTimes(1);
  });

  it('blocks deleting a category that still has menu items', async () => {
    transaction.menuCategory.findFirst.mockResolvedValue({
      id: 'category-id',
      tenantId,
    });
    transaction.menuCategory.count.mockResolvedValue(0);
    transaction.menuItem.count.mockResolvedValue(1);

    await expect(service.remove('category-id', tenantAdmin)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
