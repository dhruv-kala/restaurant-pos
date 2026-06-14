import { BadRequestException } from '@nestjs/common';
import { TaxMode, TaxProfileStatus, TaxType } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TaxProfilesService } from './tax-profiles.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const userId = '01975c30-0000-7000-8000-000000000001';

const tenantAdmin: AuthenticatedUser = {
  id: userId,
  email: 'admin@example.test',
  name: 'Admin',
  tenantId,
  outletId: null,
  roles: ['TENANT_ADMIN'],
  permissions: [],
};

interface TaxProfileUpdateManyArgs {
  where: { tenantId: string; isDefault: boolean };
  data: { isDefault: boolean; updatedByUserId: string };
}

interface TaxProfileCreateArgs {
  data: { tenantId: string; code: string; name: string; isDefault: boolean };
}

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

describe('TaxProfilesService', () => {
  it('creates a default tax profile and clears previous tenant default', async () => {
    const now = new Date('2026-06-14T00:00:00.000Z');
    const created = {
      id: '01975c30-0000-7000-8000-000000000300',
      tenantId,
      code: 'gst_default',
      name: 'GST Default',
      description: null,
      taxType: TaxType.GST,
      taxMode: TaxMode.EXCLUSIVE,
      countryCode: 'IN',
      currencyCode: 'INR',
      isDefault: true,
      status: TaxProfileStatus.ACTIVE,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const findUniqueMock = jest.fn<Promise<null>, []>().mockResolvedValue(null);
    const updateManyMock = jest
      .fn<Promise<{ count: number }>, [TaxProfileUpdateManyArgs]>()
      .mockResolvedValue({ count: 1 });
    const createMock = jest
      .fn<Promise<typeof created>, [TaxProfileCreateArgs]>()
      .mockResolvedValue(created);
    const appendMock = jest.fn();
    const tx = {
      $queryRaw: jest.fn(),
      taxProfile: {
        findUnique: findUniqueMock,
        updateMany: updateManyMock,
        create: createMock,
      },
    };
    const audit = { append: appendMock } as unknown as AuditService;
    const service = new TaxProfilesService(transactionalPrisma(tx), audit);

    const result = await service.create(
      {
        code: 'gst_default',
        name: ' GST Default ',
        taxType: TaxType.GST,
        taxMode: TaxMode.EXCLUSIVE,
        isDefault: true,
      },
      tenantAdmin,
      {},
    );

    const updateCall = updateManyMock.mock.calls[0][0];
    expect(updateCall.where).toEqual({ tenantId, isDefault: true });
    expect(updateCall.data).toEqual(
      expect.objectContaining({ isDefault: false, updatedByUserId: userId }),
    );

    const createCall = createMock.mock.calls[0][0];
    expect(createCall.data).toEqual(
      expect.objectContaining({
        tenantId,
        code: 'gst_default',
        name: 'GST Default',
        isDefault: true,
      }),
    );
    expect(appendMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'tax.profile.created',
        targetType: 'TaxProfile',
        targetId: created.id,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: created.id, isDefault: true }));
  });

  it('rejects incompatible tax type and mode combinations', async () => {
    const tx = { $queryRaw: jest.fn() };
    const service = new TaxProfilesService(transactionalPrisma(tx), {} as AuditService);

    await expect(
      service.create(
        {
          code: 'bad_exempt',
          name: 'Bad Exempt',
          taxType: TaxType.EXEMPT,
          taxMode: TaxMode.EXCLUSIVE,
        },
        tenantAdmin,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
