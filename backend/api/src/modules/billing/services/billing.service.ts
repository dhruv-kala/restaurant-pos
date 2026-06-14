import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillPaymentStatus, BillSource, BillStatus, OrderStatus, Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { BillQueryDto } from '../dto/bill-query.dto';
import type {
  BillListResponseDto,
  BillResponseDto,
  PrintableBillResponseDto,
} from '../dto/bill-response.dto';
import type { GenerateBillDto } from '../dto/generate-bill.dto';
import type { MergeBillDto } from '../dto/merge-bill.dto';
import type { SplitBillDto } from '../dto/split-bill.dto';
import type { UpdateBillDto } from '../dto/update-bill.dto';
import type { VoidBillDto } from '../dto/void-bill.dto';
import {
  TaxCalculationService,
  type TaxCalculationResult,
} from '../../tax/services/tax-calculation.service';
import { GstMode, SplitBillMode } from '../enums/billing.enums';
import { BillingEventsService } from '../events/billing-events.service';
import {
  allocate,
  calculateBillMoney,
  gstBreakdown,
  type BillMoney,
} from './billing-calculation.util';
import {
  requireBillingRead,
  requireBillingWrite,
  resolveBillingScope,
} from './billing-access.util';

const billInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  taxes: { orderBy: [{ taxName: 'asc' }, { taxRate: 'asc' }] },
  order: {
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      tableId: true,
      customerId: true,
      table: { select: { tableNumber: true, displayName: true } },
    },
  },
  generatedBy: { select: { id: true, displayName: true } },
  voidedBy: { select: { id: true, displayName: true } },
} satisfies Prisma.BillInclude;

type BillRecord = Prisma.BillGetPayload<{ include: typeof billInclude }>;
type BillItemCreate = {
  orderItemId: string;
  menuItemId: string;
  kitchenCategoryId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  taxPercentage: Prisma.Decimal;
  lineTotal: number;
  preparationTimeMinutes?: number;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: BillingEventsService,
    private readonly taxCalculation: TaxCalculationService,
  ) {}

  async generate(dto: GenerateBillDto, user: AuthenticatedUser): Promise<BillResponseDto> {
    requireBillingWrite(user);
    const scope = resolveBillingScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const order = await tx.order.findFirst({
        where: {
          id: dto.orderId,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: { items: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
      });
      if (order === null) throw new NotFoundException('Order not found');
      if (order.status === OrderStatus.CANCELLED) {
        throw new ConflictException('Cancelled orders cannot be billed');
      }
      if (order.status !== OrderStatus.COMPLETED) {
        throw new ConflictException('Only completed orders can be billed');
      }
      const existing = await tx.bill.findFirst({
        where: {
          tenantId: order.tenantId,
          orderId: order.id,
          status: { in: [BillStatus.DRAFT, BillStatus.GENERATED, BillStatus.PAID] },
        },
        select: { id: true },
      });
      if (existing !== null) throw new ConflictException('Order already has an active bill');
      const items = order.items.map((item) => this.orderItemSnapshot(item));
      const itemGrossAmounts = items.map((item) => item.unitPrice * item.quantity);
      const itemDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
      const requestedDiscount = Math.max(0, dto.discountAmount ?? order.discountAmount);
      const additionalDiscount = Math.max(0, requestedDiscount - itemDiscount);
      const additionalDiscounts = allocate(additionalDiscount, itemGrossAmounts);
      const taxCalculation = await this.taxCalculation.calculateForBill(tx, {
        tenantId: order.tenantId,
        outletId: order.outletId,
        businessDate: order.businessDate,
        currencyCode: order.currencyCode,
        items: items.map((item, index) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount + additionalDiscounts[index],
        })),
      });
      const itemsWithTax = items.map((item, index) => {
        const line = taxCalculation.lines[index];
        return {
          ...item,
          discountAmount: line.discountAmount,
          taxAmount: line.taxAmount,
          taxPercentage: new Prisma.Decimal(line.taxRateBps).div(100),
          lineTotal: line.totalAmount,
        };
      });
      const money = calculateBillMoney({
        subtotal: taxCalculation.taxableAmount + taxCalculation.discountAmount,
        discountAmount: taxCalculation.discountAmount,
        couponDiscountAmount: 0,
        taxAmount: taxCalculation.taxAmount,
        serviceChargeAmount: dto.serviceChargeAmount ?? order.serviceChargeAmount,
      });
      const bill = await this.createBill(tx, {
        tenantId: order.tenantId,
        outletId: order.outletId,
        orderId: order.id,
        businessDate: order.businessDate,
        currencyCode: order.currencyCode,
        generatedByUserId: user.id,
        billSource: dto.billSource ?? BillSource.POS,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerGSTNumber: dto.customerGSTNumber,
        notes: dto.notes?.trim(),
        money,
        items: itemsWithTax,
        taxes: taxCalculation.billTaxes,
        sourceBillIds: [],
        taxCalculation,
      });
      this.events.publishGenerated({
        type: 'BillGenerated',
        tenantId: bill.tenantId,
        outletId: bill.outletId,
        billId: bill.id,
      });
      return this.toResponse(bill);
    });
  }

  async findAll(query: BillQueryDto, user: AuthenticatedUser): Promise<BillListResponseDto> {
    requireBillingRead(user);
    const scope = resolveBillingScope(query.tenantId, query.outletId, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.BillWhereInput = {
        ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
        ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        status: query.status,
        orderId: query.orderId,
        ...(query.billNumber?.trim()
          ? { billNumber: { contains: query.billNumber.trim(), mode: 'insensitive' } }
          : {}),
        generatedAt:
          query.fromDate === undefined && query.toDate === undefined
            ? undefined
            : { gte: query.fromDate, lte: query.toDate },
      };
      const [data, total] = await Promise.all([
        tx.bill.findMany({
          where,
          include: billInclude,
          orderBy: { generatedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.bill.count({ where }),
      ]);
      return {
        data: data.map((bill) => this.toResponse(bill)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<BillResponseDto> {
    requireBillingRead(user);
    return this.withBill(id, user, (_tx, bill) => Promise.resolve(this.toResponse(bill)));
  }

  async update(id: string, dto: UpdateBillDto, user: AuthenticatedUser): Promise<BillResponseDto> {
    requireBillingWrite(user);
    return this.withBill(id, user, async (tx, bill) => {
      this.assertEditable(bill);
      const money = calculateBillMoney({
        subtotal: bill.subtotal,
        discountAmount: dto.discountAmount ?? bill.discountAmount,
        couponDiscountAmount: bill.couponDiscountAmount,
        taxAmount: bill.taxAmount,
        serviceChargeAmount: dto.serviceChargeAmount ?? bill.serviceChargeAmount,
      });
      const updated = await tx.bill.update({
        where: { id },
        data: {
          ...money,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerGSTNumber: dto.customerGSTNumber,
          notes: dto.notes?.trim(),
          outstandingAmount: money.grandTotal,
          version: { increment: 1 },
        },
        include: billInclude,
      });
      return this.toResponse(updated);
    });
  }

  async void(id: string, dto: VoidBillDto, user: AuthenticatedUser): Promise<BillResponseDto> {
    requireBillingWrite(user);
    return this.withBill(id, user, async (tx, bill) => {
      if (bill.paymentStatus !== BillPaymentStatus.UNPAID) {
        throw new ConflictException('Bills with payment activity cannot be voided');
      }
      if (bill.status === BillStatus.PAID)
        throw new ConflictException('Paid bills cannot be voided');
      if (bill.status === BillStatus.VOID) throw new ConflictException('Bill is already void');
      if (bill.status === BillStatus.REFUNDED) {
        throw new ConflictException('Refunded bills cannot be voided');
      }
      const updated = await this.markVoided(tx, bill.id, dto.reason.trim(), user.id);
      this.events.publishVoided({
        type: 'BillVoided',
        tenantId: updated.tenantId,
        outletId: updated.outletId,
        billId: updated.id,
      });
      return this.toResponse(updated);
    });
  }

  async printable(id: string, user: AuthenticatedUser): Promise<PrintableBillResponseDto> {
    requireBillingRead(user);
    return this.withBill(id, user, async (tx, bill) => {
      const printedAt = new Date();
      const updated = await tx.bill.update({
        where: { id },
        data: {
          printCount: { increment: 1 },
          lastPrintedAt: printedAt,
          version: { increment: 1 },
        },
        include: billInclude,
      });
      return { ...this.toResponse(updated), reprint: bill.printCount > 0, printedAt };
    });
  }

  async split(id: string, dto: SplitBillDto, user: AuthenticatedUser): Promise<BillResponseDto[]> {
    requireBillingWrite(user);
    return this.withBill(id, user, async (tx, bill) => {
      this.assertEditable(bill);
      const parts =
        dto.splitMode === SplitBillMode.ITEM_BASED
          ? this.itemParts(bill, dto)
          : this.amountParts(bill, dto);
      const replacements: BillRecord[] = [];
      for (const part of parts) {
        replacements.push(
          await this.createBill(tx, {
            tenantId: bill.tenantId,
            outletId: bill.outletId,
            orderId: bill.orderId,
            currencyCode: bill.currencyCode,
            generatedByUserId: user.id,
            billSource: bill.billSource,
            customerName: bill.customerName ?? undefined,
            customerPhone: bill.customerPhone ?? undefined,
            customerGSTNumber: bill.customerGSTNumber ?? undefined,
            notes: `Split from ${bill.billNumber}`,
            money: part.money,
            items: part.items,
            taxes: part.taxes,
            sourceBillIds: [bill.id],
          }),
        );
      }
      await this.markVoided(tx, bill.id, `Superseded by ${dto.splitMode} split`, user.id);
      return replacements.map((replacement) => this.toResponse(replacement));
    });
  }

  async merge(dto: MergeBillDto, user: AuthenticatedUser): Promise<BillResponseDto> {
    requireBillingWrite(user);
    const scope = resolveBillingScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const bills = await tx.bill.findMany({
        where: {
          id: { in: dto.billIds },
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: billInclude,
      });
      if (bills.length !== dto.billIds.length)
        throw new NotFoundException('One or more bills not found');
      for (const bill of bills) this.assertEditable(bill);
      const first = bills[0];
      if (
        bills.some((bill) => bill.tenantId !== first.tenantId || bill.outletId !== first.outletId)
      ) {
        throw new BadRequestException('Bills must belong to the same outlet');
      }
      const sameTable =
        first.order.tableId !== null &&
        bills.every((bill) => bill.order.tableId === first.order.tableId);
      const sameCustomer =
        first.order.customerId !== null &&
        bills.every((bill) => bill.order.customerId === first.order.customerId);
      if (!sameTable && !sameCustomer) {
        throw new BadRequestException('Bills must have the same customer or table');
      }
      const items = bills.flatMap((bill) => bill.items.map((item) => this.billItemSnapshot(item)));
      const money: BillMoney = {
        subtotal: bills.reduce((sum, bill) => sum + bill.subtotal, 0),
        discountAmount: bills.reduce((sum, bill) => sum + bill.discountAmount, 0),
        couponDiscountAmount: bills.reduce((sum, bill) => sum + bill.couponDiscountAmount, 0),
        taxAmount: bills.reduce((sum, bill) => sum + bill.taxAmount, 0),
        serviceChargeAmount: bills.reduce((sum, bill) => sum + bill.serviceChargeAmount, 0),
        roundOffAmount: bills.reduce((sum, bill) => sum + bill.roundOffAmount, 0),
        grandTotal: bills.reduce((sum, bill) => sum + bill.grandTotal, 0),
      };
      const taxes = this.mergeTaxes(bills.flatMap((bill) => bill.taxes));
      const merged = await this.createBill(tx, {
        tenantId: first.tenantId,
        outletId: first.outletId,
        orderId: first.orderId,
        currencyCode: first.currencyCode,
        generatedByUserId: user.id,
        billSource: first.billSource,
        customerName: first.customerName ?? undefined,
        customerPhone: first.customerPhone ?? undefined,
        customerGSTNumber: first.customerGSTNumber ?? undefined,
        notes: `Merged from ${bills.map((bill) => bill.billNumber).join(', ')}`,
        money,
        items,
        taxes,
        sourceBillIds: bills.map((bill) => bill.id),
      });
      for (const bill of bills) {
        await this.markVoided(
          tx,
          bill.id,
          `Superseded by merged bill ${merged.billNumber}`,
          user.id,
        );
      }
      return this.toResponse(merged);
    });
  }

  private async createBill(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      outletId: string;
      orderId: string;
      businessDate?: Date;
      currencyCode: string;
      generatedByUserId: string;
      billSource: BillSource;
      customerName?: string;
      customerPhone?: string;
      customerGSTNumber?: string;
      notes?: string;
      money: BillMoney;
      items: BillItemCreate[];
      taxes: Array<{ taxName: string; taxRate: number; taxAmount: number }>;
      sourceBillIds: string[];
      taxCalculation?: TaxCalculationResult;
    },
  ): Promise<BillRecord> {
    const billNumber = await this.nextBillNumber(tx, input.tenantId, input.outletId);
    const bill = await tx.bill.create({
      data: {
        tenantId: input.tenantId,
        outletId: input.outletId,
        orderId: input.orderId,
        billNumber,
        businessDate: input.businessDate ?? this.businessDate(),
        currencyCode: input.currencyCode,
        generatedByUserId: input.generatedByUserId,
        billSource: input.billSource,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerGSTNumber: input.customerGSTNumber,
        notes: input.notes,
        sourceBillIds: input.sourceBillIds,
        ...input.money,
        outstandingAmount: input.money.grandTotal,
        items: { create: input.items },
        taxes: {
          create: input.taxes.map((tax) => ({
            tenantId: input.tenantId,
            ...tax,
          })),
        },
      },
      include: billInclude,
    });
    if (input.taxCalculation !== undefined) {
      await this.taxCalculation.createBillSnapshot(tx, input.taxCalculation, {
        orderId: input.orderId,
        billId: bill.id,
        createdByUserId: input.generatedByUserId,
      });
    }
    return bill;
  }

  private orderItemSnapshot(item: {
    id: string;
    menuItemId: string;
    kitchenCategoryId: string | null;
    itemName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    taxPercentage: Prisma.Decimal;
    lineTotal: number;
    actualPrepMinutes: number | null;
  }): BillItemCreate {
    return {
      orderItemId: item.id,
      menuItemId: item.menuItemId,
      kitchenCategoryId: item.kitchenCategoryId ?? undefined,
      name: item.variantName === null ? item.itemName : `${item.itemName} - ${item.variantName}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      taxAmount: item.taxAmount,
      taxPercentage: item.taxPercentage,
      lineTotal: item.lineTotal,
      preparationTimeMinutes: item.actualPrepMinutes ?? undefined,
    };
  }

  private taxesForItems(items: BillItemCreate[], mode: GstMode) {
    const groups = new Map<number, number>();
    for (const item of items) {
      const rate = item.taxPercentage.toNumber();
      groups.set(rate, (groups.get(rate) ?? 0) + item.taxAmount);
    }
    return gstBreakdown(
      [...groups].map(([rate, amount]) => ({ rate, amount })),
      mode,
    );
  }

  private amountParts(bill: BillRecord, dto: SplitBillDto) {
    const totals =
      dto.splitMode === SplitBillMode.CUSTOM_AMOUNT
        ? dto.customAmounts
        : allocate(bill.grandTotal, Array.from<number>({ length: dto.splitCount ?? 2 }).fill(1));
    if (totals === undefined || totals.length < 2) {
      throw new BadRequestException('Split amounts are required');
    }
    if (totals.reduce((sum, value) => sum + value, 0) !== bill.grandTotal) {
      throw new BadRequestException('Split amounts must equal the bill grand total');
    }
    const firstItem = bill.items[0];
    if (firstItem === undefined) throw new ConflictException('Bill has no items');
    const fields = [
      'subtotal',
      'discountAmount',
      'couponDiscountAmount',
      'taxAmount',
      'serviceChargeAmount',
    ] as const;
    const allocations = Object.fromEntries(
      fields.map((field) => [field, allocate(bill[field], totals)]),
    ) as Record<(typeof fields)[number], number[]>;
    const taxAllocations = bill.taxes.map((tax) => allocate(tax.taxAmount, totals));
    return totals.map((total, index) => {
      const money = calculateBillMoney({
        subtotal: allocations.subtotal[index],
        discountAmount: allocations.discountAmount[index],
        couponDiscountAmount: allocations.couponDiscountAmount[index],
        taxAmount: allocations.taxAmount[index],
        serviceChargeAmount: allocations.serviceChargeAmount[index],
      });
      if (money.grandTotal !== total) {
        money.roundOffAmount += total - money.grandTotal;
        money.grandTotal = total;
      }
      return {
        money,
        items: [
          {
            orderItemId: firstItem.orderItemId,
            menuItemId: firstItem.menuItemId,
            name: `Share ${index + 1} of ${bill.billNumber}`,
            quantity: 1,
            unitPrice: money.subtotal,
            discountAmount: money.discountAmount + money.couponDiscountAmount,
            taxAmount: money.taxAmount,
            taxPercentage: new Prisma.Decimal(0),
            lineTotal: total,
          },
        ],
        taxes: bill.taxes.map((tax, taxIndex) => ({
          taxName: tax.taxName,
          taxRate: tax.taxRate.toNumber(),
          taxAmount: taxAllocations[taxIndex][index],
        })),
      };
    });
  }

  private itemParts(bill: BillRecord, dto: SplitBillDto) {
    const groups = dto.itemGroups;
    if (groups === undefined) throw new BadRequestException('Item groups are required');
    const selected = groups.flatMap((group) => group.orderItemIds);
    if (new Set(selected).size !== selected.length) {
      throw new BadRequestException('An item cannot appear in multiple split groups');
    }
    if (
      selected.length !== bill.items.length ||
      bill.items.some((item) => !selected.includes(item.orderItemId))
    ) {
      throw new BadRequestException('Every bill item must be assigned exactly once');
    }
    const groupedItems = groups.map((group) =>
      bill.items
        .filter((item) => group.orderItemIds.includes(item.orderItemId))
        .map((item) => this.billItemSnapshot(item)),
    );
    const weights = groupedItems.map((items) =>
      items.reduce((sum, item) => sum + item.lineTotal, 0),
    );
    const itemDiscountTotal = bill.items.reduce((sum, item) => sum + item.discountAmount, 0);
    const additionalDiscounts = allocate(
      Math.max(0, bill.discountAmount - itemDiscountTotal),
      weights,
    );
    const couponDiscounts = allocate(bill.couponDiscountAmount, weights);
    const serviceCharges = allocate(bill.serviceChargeAmount, weights);
    const roundOffs = allocate(Math.abs(bill.roundOffAmount), weights).map((amount) =>
      bill.roundOffAmount < 0 ? -amount : amount,
    );
    const desiredTotals = allocate(bill.grandTotal, weights);

    return groupedItems.map((items, index) => {
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const money: BillMoney = {
        subtotal,
        discountAmount:
          items.reduce((sum, item) => sum + item.discountAmount, 0) + additionalDiscounts[index],
        couponDiscountAmount: couponDiscounts[index],
        taxAmount: items.reduce((sum, item) => sum + item.taxAmount, 0),
        serviceChargeAmount: serviceCharges[index],
        roundOffAmount: roundOffs[index],
        grandTotal: desiredTotals[index],
      };
      const formulaTotal =
        money.subtotal -
        money.discountAmount -
        money.couponDiscountAmount +
        money.taxAmount +
        money.serviceChargeAmount +
        money.roundOffAmount;
      money.roundOffAmount += money.grandTotal - formulaTotal;
      return {
        money,
        items,
        taxes: this.taxesForItems(items, this.gstModeFor(bill)),
      };
    });
  }

  private gstModeFor(bill: BillRecord): GstMode {
    return bill.taxes.some((tax) => tax.taxName === 'IGST') ? GstMode.IGST : GstMode.CGST_SGST;
  }

  private billItemSnapshot(item: BillRecord['items'][number]): BillItemCreate {
    return {
      orderItemId: item.orderItemId,
      menuItemId: item.menuItemId,
      kitchenCategoryId: item.kitchenCategoryId ?? undefined,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      taxAmount: item.taxAmount,
      taxPercentage: item.taxPercentage,
      lineTotal: item.lineTotal,
      preparationTimeMinutes: item.preparationTimeMinutes ?? undefined,
    };
  }

  private mergeTaxes(taxes: BillRecord['taxes']) {
    const groups = new Map<string, { taxName: string; taxRate: number; taxAmount: number }>();
    for (const tax of taxes) {
      const taxRate = tax.taxRate.toNumber();
      const key = `${tax.taxName}:${taxRate}`;
      const current = groups.get(key);
      groups.set(key, {
        taxName: tax.taxName,
        taxRate,
        taxAmount: (current?.taxAmount ?? 0) + tax.taxAmount,
      });
    }
    return [...groups.values()];
  }

  private async nextBillNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
  ): Promise<string> {
    const businessDate = this.businessDate();
    const counter = await tx.billNumberCounter.upsert({
      where: { tenantId_outletId_businessDate: { tenantId, outletId, businessDate } },
      create: { tenantId, outletId, businessDate, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
      select: { lastNumber: true },
    });
    return `BILL-${businessDate.toISOString().slice(0, 10).replaceAll('-', '')}-${counter.lastNumber
      .toString()
      .padStart(5, '0')}`;
  }

  private businessDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private assertEditable(bill: BillRecord): void {
    if (bill.paymentStatus !== BillPaymentStatus.UNPAID) {
      throw new ConflictException('Bills with payment activity cannot be changed');
    }
    if (bill.status === BillStatus.PAID)
      throw new ConflictException('Paid bills cannot be changed');
    if (bill.status === BillStatus.VOID)
      throw new ConflictException('Void bills cannot be changed');
    if (bill.status === BillStatus.REFUNDED) {
      throw new ConflictException('Refunded bills cannot be changed');
    }
  }

  private markVoided(
    tx: Prisma.TransactionClient,
    id: string,
    reason: string,
    userId: string,
  ): Promise<BillRecord> {
    return tx.bill.update({
      where: { id },
      data: {
        status: BillStatus.VOID,
        voidReason: reason,
        voidedByUserId: userId,
        voidedAt: new Date(),
        version: { increment: 1 },
      },
      include: billInclude,
    });
  }

  private async withBill<T>(
    id: string,
    user: AuthenticatedUser,
    operation: (tx: Prisma.TransactionClient, bill: BillRecord) => Promise<T>,
  ): Promise<T> {
    const scope = resolveBillingScope(undefined, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const bill = await tx.bill.findFirst({
        where: {
          id,
          ...(scope.tenantId === undefined ? {} : { tenantId: scope.tenantId }),
          ...(scope.outletId === undefined ? {} : { outletId: scope.outletId }),
        },
        include: billInclude,
      });
      if (bill === null) throw new NotFoundException('Bill not found');
      return operation(tx, bill);
    });
  }

  private toResponse(bill: BillRecord): BillResponseDto {
    return {
      ...bill,
      items: bill.items.map((item) => ({
        ...item,
        taxPercentage: item.taxPercentage.toNumber(),
      })),
      taxes: bill.taxes.map((tax) => ({ ...tax, taxRate: tax.taxRate.toNumber() })),
    };
  }
}
