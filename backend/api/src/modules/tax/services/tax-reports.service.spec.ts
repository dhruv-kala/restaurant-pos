import { BadRequestException } from '@nestjs/common';
import { BillStatus, ReceiptStatus, ReceiptType, TaxMode } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { AuditService } from '../../audit/services/audit.service';
import { TaxReportsService } from './tax-reports.service';

const tenantId = '01975c30-0000-7000-8000-000000000100';
const outletId = '01975c30-0000-7000-8000-000000000200';
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

function transactionalPrisma(tx: object): PrismaService {
  return {
    $transaction: jest.fn((callback: (transaction: object) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
}

const decimal = (value: number) => ({ toNumber: () => value });

function bill(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '01975c30-0000-7000-8000-000000000301',
    tenantId,
    outletId,
    billNumber: 'BILL-1',
    invoiceNumber: null,
    businessDate: new Date('2026-06-14T00:00:00.000Z'),
    status: BillStatus.GENERATED,
    currencyCode: 'INR',
    subtotal: 1180,
    discountAmount: 0,
    couponDiscountAmount: 0,
    taxAmount: 180,
    grandTotal: 1180,
    outlet: { id: outletId, code: 'MAIN', name: 'Main Outlet' },
    taxes: [
      { taxName: 'CGST', taxRate: decimal(9), taxAmount: 90 },
      { taxName: 'SGST', taxRate: decimal(9), taxAmount: 90 },
    ],
    receipts: [
      {
        id: '01975c30-0000-7000-8000-000000000401',
        receiptNumber: 'INV-1',
        invoiceNumber: 'TAX-1',
        receiptType: ReceiptType.TAX_INVOICE,
        status: ReceiptStatus.GENERATED,
      },
    ],
    taxCalculationSnapshots: [
      {
        id: '01975c30-0000-7000-8000-000000000501',
        taxableAmount: 1000,
        taxMode: TaxMode.INCLUSIVE,
        taxProfileId: '01975c30-0000-7000-8000-000000000601',
      },
    ],
    ...overrides,
  };
}

describe('TaxReportsService', () => {
  it('summarizes tax from bill and tax calculation snapshots', async () => {
    const append = jest.fn();
    const findMany = jest.fn<Promise<unknown[]>, [unknown]>().mockResolvedValue([bill()]);
    const tx = {
      $queryRaw: jest.fn(),
      bill: { findMany },
      reportGenerationAudit: {
        create: jest.fn().mockResolvedValue({ id: '01975c30-0000-7000-8000-000000000701' }),
      },
    };
    const service = new TaxReportsService(transactionalPrisma(tx), {
      append,
    } as unknown as AuditService);

    const result = await service.summary(
      { tenantId, businessDate: new Date('2026-06-14T00:00:00.000Z'), page: 1, limit: 50 },
      tenantAdmin,
    );

    const findManyArgs = findMany.mock.calls[0]?.[0] as {
      where: { tenantId: string; status: { not: BillStatus } };
    };
    expect(findManyArgs.where.tenantId).toBe(tenantId);
    expect(findManyArgs.where.status).toEqual({ not: BillStatus.VOID });
    expect(result).toMatchObject({
      invoiceCount: 1,
      taxInvoiceCount: 1,
      taxableAmount: 1000,
      taxCollectedAmount: 180,
      totalAmount: 1180,
      components: [
        { taxName: 'CGST', taxRate: 9, taxAmount: 90 },
        { taxName: 'SGST', taxRate: 9, taxAmount: 90 },
      ],
    });
    expect(append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'tax.report.generated',
        metadata: { reportType: 'TAX_SUMMARY' },
      }),
    );
  });

  it('returns paginated invoice-level detail rows', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      bill: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([bill({ billNumber: 'BILL-2' })]),
      },
      reportGenerationAudit: {
        create: jest.fn().mockResolvedValue({ id: '01975c30-0000-7000-8000-000000000702' }),
      },
    };
    const service = new TaxReportsService(transactionalPrisma(tx), {
      append: jest.fn(),
    } as unknown as AuditService);

    const result = await service.detailed(
      { tenantId, fromDate: new Date('2026-06-14T00:00:00.000Z'), page: 1, limit: 10 },
      tenantAdmin,
    );

    expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(result.data[0]).toMatchObject({
      billNumber: 'BILL-2',
      invoiceNumber: 'TAX-1',
      taxableAmount: 1000,
      taxAmount: 180,
      taxMode: TaxMode.INCLUSIVE,
    });
  });

  it('requires explicit tenant scope for platform tax reports', async () => {
    const service = new TaxReportsService(transactionalPrisma({}), {
      append: jest.fn(),
    } as unknown as AuditService);
    await expect(
      service.summary(
        { businessDate: new Date('2026-06-14T00:00:00.000Z'), page: 1, limit: 50 },
        { ...tenantAdmin, tenantId: null, roles: ['SUPER_ADMIN'] },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
