import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { MenuItemsService } from './menu-items.service';

describe('MenuItemsService', () => {
  const tenantId = '01975f6f-b03d-7ac2-893f-c7e858a42ff2';
  const manager: AuthenticatedUser = {
    id: 'user-id',
    email: 'manager@example.com',
    name: 'Manager',
    tenantId,
    outletId: null,
    roles: ['MANAGER'],
  };
  const waiter: AuthenticatedUser = { ...manager, roles: ['WAITER'] };
  const transaction = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    menuCategory: { findFirst: jest.fn() },
    outlet: { count: jest.fn() },
    menuItem: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };
  const service = new MenuItemsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.$queryRaw.mockResolvedValue([]);
  });

  it('denies waiter menu management', async () => {
    await expect(
      service.create({ name: 'Paneer Tikka', categoryId: 'category-id', price: 28000 }, waiter),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects more than one default variant', async () => {
    await expect(
      service.create(
        {
          name: 'Pizza',
          categoryId: 'category-id',
          price: 30000,
          variants: [
            { name: 'Small', isDefault: true },
            { name: 'Medium', isDefault: true },
          ],
        },
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects outlet prices that reference another tenant', async () => {
    transaction.menuCategory.findFirst.mockResolvedValue({ id: 'category-id' });
    transaction.outlet.count.mockResolvedValue(0);

    await expect(
      service.create(
        {
          name: 'Coke',
          categoryId: 'category-id',
          price: 6000,
          outletPrices: [{ outletId: 'other-outlet', price: 7000 }],
        },
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
