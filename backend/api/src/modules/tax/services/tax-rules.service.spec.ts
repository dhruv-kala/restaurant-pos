import { ConflictException } from '@nestjs/common';
import {
  TaxComponent,
  TaxGroupStatus,
  TaxMappingTarget,
  TaxRateStatus,
  TaxRuleStatus,
  TaxType,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TaxRulesService } from './tax-rules.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const userId = '01975c30-0000-7000-8000-000000000001';
const profileId = '01975c30-0000-7000-8000-000000000301';
const ruleId = '01975c30-0000-7000-8000-000000000401';
const categoryId = '01975c30-0000-7000-8000-000000000501';

const tenantAdmin: AuthenticatedUser = {
  id: userId,
  email: 'admin@example.test',
  name: 'Admin',
  tenantId,
  outletId: null,
  roles: ['TENANT_ADMIN'],
  permissions: [],
};

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

describe('TaxRulesService', () => {
  it('creates a tax rate and audits the configuration change', async () => {
    const now = new Date('2026-06-14T00:00:00.000Z');
    const created = {
      id: '01975c30-0000-7000-8000-000000000302',
      tenantId,
      profileId,
      code: 'gst_18',
      name: 'GST 18%',
      description: null,
      component: TaxComponent.GST,
      taxType: TaxType.GST,
      rateBps: 1800,
      status: TaxRateStatus.ACTIVE,
      effectiveFrom: now,
      effectiveTo: null,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const appendMock = jest.fn();
    const createRateMock = jest
      .fn<Promise<typeof created>, [{ data: Record<string, unknown> }]>()
      .mockResolvedValue(created);
    const tx = {
      $queryRaw: jest.fn(),
      taxProfile: { findFirst: jest.fn().mockResolvedValue({ id: profileId }) },
      taxRate: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createRateMock,
      },
    };
    const service = new TaxRulesService(
      transactionalPrisma(tx),
      { append: appendMock } as unknown as AuditService,
    );

    const result = await service.createRate(
      {
        profileId,
        code: 'GST_18',
        name: ' GST 18% ',
        component: TaxComponent.GST,
        taxType: TaxType.GST,
        rateBps: 1800,
        effectiveFrom: now.toISOString(),
      },
      tenantAdmin,
      {},
    );

    const createArgs = createRateMock.mock.calls[0][0];
    expect(createArgs.data).toMatchObject({
      tenantId,
      profileId,
      code: 'gst_18',
      name: 'GST 18%',
      rateBps: 1800,
    });
    expect(appendMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'tax.rate.created',
        targetType: 'TaxRate',
        targetId: created.id,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: created.id, rateBps: 1800 }));
  });

  it('rejects overlapping active category mappings for the same target', async () => {
    const now = new Date('2026-06-14T00:00:00.000Z');
    const tx = {
      $queryRaw: jest.fn(),
      taxRule: {
        findFirst: jest.fn().mockResolvedValue({
          id: ruleId,
          tenantId,
          profileId,
          taxGroupId: '01975c30-0000-7000-8000-000000000402',
          code: 'dine_in_food',
          name: 'Dine-in Food',
          description: null,
          priority: 100,
          status: TaxRuleStatus.ACTIVE,
          effectiveFrom: now,
          effectiveTo: null,
          createdByUserId: userId,
          updatedByUserId: userId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          taxGroup: {
            id: '01975c30-0000-7000-8000-000000000402',
            tenantId,
            profileId,
            code: 'gst_5_group',
            name: 'GST 5%',
            description: null,
            status: TaxGroupStatus.ACTIVE,
            effectiveFrom: now,
            effectiveTo: null,
            createdByUserId: userId,
            updatedByUserId: userId,
            version: 1,
            createdAt: now,
            updatedAt: now,
            rates: [],
          },
        }),
      },
      menuCategory: { findFirst: jest.fn().mockResolvedValue({ id: categoryId }) },
      taxCategoryMapping: {
        findFirst: jest.fn().mockResolvedValue({ id: '01975c30-0000-7000-8000-000000000601' }),
        create: jest.fn(),
      },
    };
    const service = new TaxRulesService(
      transactionalPrisma(tx),
      { append: jest.fn() } as unknown as AuditService,
    );

    await expect(
      service.createMapping(
        {
          taxRuleId: ruleId,
          target: TaxMappingTarget.CATEGORY,
          menuCategoryId: categoryId,
          effectiveFrom: now.toISOString(),
        },
        tenantAdmin,
        {},
      ),
    ).rejects.toThrow(ConflictException);
    expect(tx.taxCategoryMapping.create).not.toHaveBeenCalled();
  });

  it('creates a tenant default mapping without menu target lookup', async () => {
    const now = new Date('2026-06-14T00:00:00.000Z');
    const taxGroup = {
      id: '01975c30-0000-7000-8000-000000000402',
      tenantId,
      profileId,
      code: 'gst_5_group',
      name: 'GST 5%',
      description: null,
      status: TaxGroupStatus.ACTIVE,
      effectiveFrom: now,
      effectiveTo: null,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      rates: [],
    };
    const taxRule = {
      id: ruleId,
      tenantId,
      profileId,
      taxGroupId: taxGroup.id,
      code: 'tenant_default',
      name: 'Tenant Default',
      description: null,
      priority: 1000,
      status: TaxRuleStatus.ACTIVE,
      effectiveFrom: now,
      effectiveTo: null,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      taxGroup,
    };
    const created = {
      id: '01975c30-0000-7000-8000-000000000602',
      tenantId,
      taxRuleId: ruleId,
      target: TaxMappingTarget.TENANT_DEFAULT,
      menuCategoryId: null,
      menuItemId: null,
      effectiveFrom: now,
      effectiveTo: null,
      isActive: true,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      taxRule,
    };
    const createMappingMock = jest
      .fn<Promise<typeof created>, [{ data: Record<string, unknown>; include: object }]>()
      .mockResolvedValue(created);
    const tx = {
      $queryRaw: jest.fn(),
      taxRule: { findFirst: jest.fn().mockResolvedValue(taxRule) },
      menuCategory: { findFirst: jest.fn() },
      menuItem: { findFirst: jest.fn() },
      taxCategoryMapping: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: createMappingMock,
      },
    };
    const service = new TaxRulesService(
      transactionalPrisma(tx),
      { append: jest.fn() } as unknown as AuditService,
    );

    const result = await service.createMapping(
      {
        taxRuleId: ruleId,
        target: TaxMappingTarget.TENANT_DEFAULT,
        effectiveFrom: now.toISOString(),
      },
      tenantAdmin,
      {},
    );

    expect(tx.menuCategory.findFirst).not.toHaveBeenCalled();
    expect(tx.menuItem.findFirst).not.toHaveBeenCalled();
    expect(createMappingMock.mock.calls[0][0].data).toMatchObject({
      tenantId,
      taxRuleId: ruleId,
      target: TaxMappingTarget.TENANT_DEFAULT,
      menuCategoryId: null,
      menuItemId: null,
    });
    expect(result).toEqual(expect.objectContaining({ target: TaxMappingTarget.TENANT_DEFAULT }));
  });
});
