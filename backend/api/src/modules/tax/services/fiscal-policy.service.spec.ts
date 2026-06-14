import { ConflictException } from '@nestjs/common';
import {
  FiscalInvoiceSequenceStatus,
  FiscalPolicyStatus,
  OutletStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { FiscalPolicyService } from './fiscal-policy.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
const userId = '01975c30-0000-7000-8000-000000000001';
const policyId = '01975c30-0000-7000-8000-000000000701';
const sequenceId = '01975c30-0000-7000-8000-000000000801';

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

describe('FiscalPolicyService', () => {
  it('rejects overlapping active fiscal policies for the same outlet', async () => {
    const now = new Date('2026-06-14T00:00:00.000Z');
    const tx = {
      $queryRaw: jest.fn(),
      outlet: {
        findFirst: jest.fn().mockResolvedValue({
          id: outletId,
          timezone: 'Asia/Kolkata',
          status: OutletStatus.ACTIVE,
        }),
      },
      outletFiscalPolicy: {
        findFirst: jest.fn().mockResolvedValue({ id: policyId }),
        create: jest.fn(),
      },
    };
    const service = new FiscalPolicyService(
      transactionalPrisma(tx),
      { append: jest.fn() } as unknown as AuditService,
    );

    await expect(
      service.createPolicy(
        {
          outletId,
          invoicePrefix: 'INV',
          timezone: 'Asia/Kolkata',
          effectiveFrom: now.toISOString(),
        },
        tenantAdmin,
        {},
      ),
    ).rejects.toThrow(ConflictException);
    expect(tx.outletFiscalPolicy.create).not.toHaveBeenCalled();
  });

  it('generates a monotonic fiscal invoice number and audits the allocation', async () => {
    const now = new Date('2026-06-14T00:00:00.000Z');
    const existing = {
      id: sequenceId,
      tenantId,
      outletId,
      fiscalPolicyId: policyId,
      fiscalYearLabel: '2026-27',
      prefix: 'INV',
      padding: 5,
      lastNumber: 41,
      status: FiscalInvoiceSequenceStatus.ACTIVE,
      startsAt: new Date('2026-04-01T00:00:00.000Z'),
      endsAt: new Date('2027-04-01T00:00:00.000Z'),
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 3,
      createdAt: now,
      updatedAt: now,
    };
    const updated = { ...existing, lastNumber: 42, version: 4 };
    const appendMock = jest.fn();
    const updateSequenceMock = jest
      .fn<Promise<typeof updated>, [{ where: { id: string }; data: Record<string, unknown> }]>()
      .mockResolvedValue(updated);
    const tx = {
      $queryRaw: jest.fn(),
      fiscalInvoiceSequence: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: updateSequenceMock,
      },
    };
    const service = new FiscalPolicyService(
      transactionalPrisma(tx),
      { append: appendMock } as unknown as AuditService,
    );

    const result = await service.generateInvoiceNumber(sequenceId, {}, tenantAdmin, {});

    const updateArgs = updateSequenceMock.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: sequenceId });
    expect(updateArgs.data).toMatchObject({
      lastNumber: { increment: 1 },
      version: { increment: 1 },
    });
    expect(result.invoiceNumber).toBe('INV-2026-27-00042');
    const auditArgs = appendMock.mock.calls[0] as [
      typeof tx,
      { action: string; targetType: string; metadata: { invoiceNumber: string } },
    ];
    expect(auditArgs[0]).toBe(tx);
    expect(auditArgs[1]).toMatchObject({
      action: 'tax.fiscal_sequence.invoice_number_generated',
      targetType: 'FiscalInvoiceSequence',
      metadata: { invoiceNumber: 'INV-2026-27-00042' },
    });
  });

  it('creates a fiscal invoice sequence starting before the first generated number', async () => {
    const now = new Date('2026-06-14T00:00:00.000Z');
    const policy = {
      id: policyId,
      tenantId,
      outletId,
      taxProfileId: null,
      invoicePrefix: 'INV',
      invoicePadding: 5,
      fiscalYearStartMonth: 4,
      fiscalYearStartDay: 1,
      timezone: 'Asia/Kolkata',
      status: FiscalPolicyStatus.ACTIVE,
      effectiveFrom: now,
      effectiveTo: null,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const created = {
      id: sequenceId,
      tenantId,
      outletId,
      fiscalPolicyId: policyId,
      fiscalYearLabel: '2026-27',
      prefix: 'INV',
      padding: 5,
      lastNumber: 99,
      status: FiscalInvoiceSequenceStatus.ACTIVE,
      startsAt: new Date('2026-04-01T00:00:00.000Z'),
      endsAt: new Date('2027-04-01T00:00:00.000Z'),
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const createSequenceMock = jest
      .fn<Promise<typeof created>, [{ data: Record<string, unknown> }]>()
      .mockResolvedValue(created);
    const tx = {
      $queryRaw: jest.fn(),
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: outletId, timezone: 'Asia/Kolkata' }) },
      outletFiscalPolicy: { findFirst: jest.fn().mockResolvedValue(policy) },
      fiscalInvoiceSequence: { create: createSequenceMock },
    };
    const service = new FiscalPolicyService(
      transactionalPrisma(tx),
      { append: jest.fn() } as unknown as AuditService,
    );

    const result = await service.createSequence(
      {
        outletId,
        fiscalPolicyId: policyId,
        fiscalYearLabel: '2026-27',
        prefix: 'INV',
        startNumber: 100,
        startsAt: '2026-04-01',
        endsAt: '2027-04-01',
      },
      tenantAdmin,
      {},
    );

    expect(createSequenceMock.mock.calls[0][0].data).toMatchObject({
      tenantId,
      outletId,
      fiscalPolicyId: policyId,
      lastNumber: 99,
    });
    expect(result).toEqual(expect.objectContaining({ id: sequenceId, lastNumber: 99 }));
  });
});
