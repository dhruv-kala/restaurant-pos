import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FiscalPolicyStatus,
  OutletStatus,
  Prisma,
  TaxGroupStatus,
  TaxMappingTarget,
  TaxMode,
  TaxProfileStatus,
  TaxRateStatus,
  TaxRuleStatus,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CalculateTaxDto } from '../dto/tax-calculation.dto';
import { requireFiscalPolicyRead, resolveTaxScope } from './tax-access.util';

export interface TaxCalculationLineInput {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface TaxCalculationRequest {
  tenantId: string;
  outletId: string;
  businessDate: Date;
  currencyCode: string;
  calculatedAt: Date;
  items: TaxCalculationLineInput[];
}

export interface TaxCalculationComponent {
  taxName: string;
  component: string;
  taxRateBps: number;
  taxRate: number;
  taxAmount: number;
}

export interface TaxCalculationLine {
  menuItemId: string;
  menuCategoryId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  grossAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRateBps: number;
  taxMode: TaxMode;
  taxRuleId?: string;
  taxGroupId?: string;
  mappingTarget?: TaxMappingTarget;
  components: TaxCalculationComponent[];
}

export interface TaxCalculationResult {
  tenantId: string;
  outletId: string;
  businessDate: Date;
  currencyCode: string;
  calculatedAt: Date;
  taxProfileId: string;
  outletFiscalPolicyId?: string;
  taxMode: TaxMode;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  lines: TaxCalculationLine[];
  billTaxes: Array<{ taxName: string; taxRate: number; taxAmount: number }>;
  calculationInput: Prisma.InputJsonValue;
  breakdown: Prisma.InputJsonValue;
}

type TxClient = Prisma.TransactionClient;

type MenuItemForTax = {
  id: string;
  categoryId: string;
};

type RateForTax = {
  id: string;
  code: string;
  name: string;
  component: string;
  rateBps: number;
  status: TaxGroupStatus;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

type RuleMappingForTax = {
  target: TaxMappingTarget;
  taxRule: {
    id: string;
    taxGroupId: string;
    priority: number;
    status: TaxRuleStatus;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    taxGroup: {
      id: string;
      status: TaxRateStatus;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      rates: Array<{ sortOrder: number; rate: RateForTax }>;
    };
  };
};

@Injectable()
export class TaxCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(dto: CalculateTaxDto, actor: AuthenticatedUser) {
    requireFiscalPolicyRead(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    const request: TaxCalculationRequest = {
      tenantId: scope.tenantId,
      outletId: dto.outletId,
      businessDate:
        dto.businessDate === undefined
          ? this.businessDate(new Date())
          : this.parseDate(dto.businessDate),
      currencyCode: dto.currencyCode ?? 'INR',
      calculatedAt: new Date(),
      items: dto.items,
    };

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const result = await this.calculateWithTx(tx, request);
      return this.toResponse(result);
    });
  }

  async calculateForBill(
    tx: TxClient,
    request: Omit<TaxCalculationRequest, 'calculatedAt'> & { calculatedAt?: Date },
  ): Promise<TaxCalculationResult> {
    return this.calculateWithTx(tx, {
      ...request,
      calculatedAt: request.calculatedAt ?? new Date(),
    });
  }

  async createBillSnapshot(
    tx: TxClient,
    result: TaxCalculationResult,
    input: { orderId: string; billId: string; createdByUserId: string },
  ): Promise<void> {
    await tx.taxCalculationSnapshot.create({
      data: {
        tenantId: result.tenantId,
        outletId: result.outletId,
        orderId: input.orderId,
        billId: input.billId,
        taxProfileId: result.taxProfileId,
        outletFiscalPolicyId: result.outletFiscalPolicyId,
        currencyCode: result.currencyCode,
        businessDate: result.businessDate,
        calculatedAt: result.calculatedAt,
        taxMode: result.taxMode,
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.discountAmount,
        taxableAmount: result.taxableAmount,
        taxAmount: result.taxAmount,
        totalAmount: result.totalAmount,
        calculationInput: result.calculationInput,
        breakdown: result.breakdown,
        createdByUserId: input.createdByUserId,
      },
    });
  }

  private async calculateWithTx(
    tx: TxClient,
    request: TaxCalculationRequest,
  ): Promise<TaxCalculationResult> {
    if (request.items.length === 0) throw new BadRequestException('At least one item is required');
    if (!/^[A-Z]{3}$/.test(request.currencyCode)) {
      throw new BadRequestException('currencyCode must be an ISO 4217 code');
    }
    await this.assertOutlet(tx, request.tenantId, request.outletId);
    const { fiscalPolicyId, profile } = await this.resolveProfile(tx, request);
    const menuItems = await this.resolveMenuItems(tx, request.tenantId, request.items);

    const lines: TaxCalculationLine[] = [];
    for (const item of request.items) {
      const menuItem = menuItems.get(item.menuItemId);
      if (menuItem === undefined)
        throw new NotFoundException(`Menu item ${item.menuItemId} not found`);
      const line = await this.calculateLine(
        tx,
        request.tenantId,
        profile.taxMode,
        request.calculatedAt,
        item,
        menuItem,
        profile.id,
      );
      lines.push(line);
    }

    const billTaxes = this.billTaxes(lines);
    const subtotalAmount = lines.reduce((sum, line) => sum + line.grossAmount, 0);
    const discountAmount = lines.reduce((sum, line) => sum + line.discountAmount, 0);
    const taxableAmount = lines.reduce((sum, line) => sum + line.taxableAmount, 0);
    const taxAmount = lines.reduce((sum, line) => sum + line.taxAmount, 0);
    const totalAmount = lines.reduce((sum, line) => sum + line.totalAmount, 0);

    const calculationInput: Prisma.InputJsonValue = {
      tenantId: request.tenantId,
      outletId: request.outletId,
      businessDate: this.isoDate(request.businessDate),
      currencyCode: request.currencyCode,
      calculatedAt: request.calculatedAt.toISOString(),
      items: request.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount ?? 0,
      })) as Prisma.InputJsonValue,
    };
    const breakdown: Prisma.InputJsonValue = {
      taxProfileId: profile.id,
      outletFiscalPolicyId: fiscalPolicyId,
      taxMode: profile.taxMode,
      subtotalAmount,
      discountAmount,
      taxableAmount,
      taxAmount,
      totalAmount,
      lines: lines.map((line) => ({
        menuItemId: line.menuItemId,
        menuCategoryId: line.menuCategoryId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        grossAmount: line.grossAmount,
        taxableAmount: line.taxableAmount,
        taxAmount: line.taxAmount,
        totalAmount: line.totalAmount,
        taxRateBps: line.taxRateBps,
        taxMode: line.taxMode,
        taxRuleId: line.taxRuleId,
        taxGroupId: line.taxGroupId,
        mappingTarget: line.mappingTarget,
        components: line.components as unknown as Prisma.InputJsonValue,
      })) as Prisma.InputJsonValue,
      billTaxes: billTaxes as unknown as Prisma.InputJsonValue,
    };

    return {
      tenantId: request.tenantId,
      outletId: request.outletId,
      businessDate: request.businessDate,
      currencyCode: request.currencyCode,
      calculatedAt: request.calculatedAt,
      taxProfileId: profile.id,
      outletFiscalPolicyId: fiscalPolicyId,
      taxMode: profile.taxMode,
      subtotalAmount,
      discountAmount,
      taxableAmount,
      taxAmount,
      totalAmount,
      lines,
      billTaxes,
      calculationInput,
      breakdown,
    };
  }

  private async assertOutlet(tx: TxClient, tenantId: string, outletId: string): Promise<void> {
    const outlet = await tx.outlet.findFirst({
      where: { tenantId, id: outletId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (outlet === null) throw new NotFoundException('Outlet not found');
    if (outlet.status !== OutletStatus.ACTIVE) throw new ConflictException('Outlet is not active');
  }

  private async resolveProfile(tx: TxClient, request: TaxCalculationRequest) {
    const fiscalPolicy = await tx.outletFiscalPolicy.findFirst({
      where: {
        tenantId: request.tenantId,
        outletId: request.outletId,
        status: FiscalPolicyStatus.ACTIVE,
        effectiveFrom: { lte: request.calculatedAt },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: request.calculatedAt } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, taxProfileId: true },
    });

    const profile = await tx.taxProfile.findFirst({
      where: {
        tenantId: request.tenantId,
        id: fiscalPolicy?.taxProfileId ?? undefined,
        isDefault:
          fiscalPolicy?.taxProfileId === null || fiscalPolicy?.taxProfileId === undefined
            ? true
            : undefined,
        status: TaxProfileStatus.ACTIVE,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, taxMode: true },
    });
    if (profile === null) throw new NotFoundException('Active tax profile not found');
    return { fiscalPolicyId: fiscalPolicy?.id, profile };
  }

  private async resolveMenuItems(
    tx: TxClient,
    tenantId: string,
    items: TaxCalculationLineInput[],
  ): Promise<Map<string, MenuItemForTax>> {
    const ids = [...new Set(items.map((item) => item.menuItemId))];
    const records = await tx.menuItem.findMany({
      where: { tenantId, id: { in: ids }, deletedAt: null },
      select: { id: true, categoryId: true },
    });
    const byId = new Map(records.map((record) => [record.id, record]));
    if (byId.size !== ids.length)
      throw new NotFoundException('One or more menu items were not found');
    return byId;
  }

  private async calculateLine(
    tx: TxClient,
    tenantId: string,
    taxMode: TaxMode,
    calculatedAt: Date,
    item: TaxCalculationLineInput,
    menuItem: MenuItemForTax,
    profileId: string,
  ): Promise<TaxCalculationLine> {
    const discountAmount = item.discountAmount ?? 0;
    const grossAmount = item.unitPrice * item.quantity;
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new BadRequestException('Item quantity must be a positive integer');
    }
    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new BadRequestException('Item unitPrice must be a non-negative integer');
    }
    if (!Number.isInteger(discountAmount) || discountAmount < 0 || discountAmount > grossAmount) {
      throw new BadRequestException(
        'Item discountAmount must be between zero and line gross amount',
      );
    }

    const netInputAmount = grossAmount - discountAmount;
    const mapping = await this.resolveRuleMapping(tx, tenantId, profileId, menuItem, calculatedAt);
    const activeRates =
      mapping === undefined
        ? []
        : mapping.taxRule.taxGroup.rates
            .map((groupRate) => groupRate.rate)
            .filter((rate) => this.isActiveRate(rate, calculatedAt));
    const totalRateBps = activeRates.reduce((sum, rate) => sum + rate.rateBps, 0);
    const effectiveTaxMode = totalRateBps === 0 ? TaxMode.ZERO_RATED : taxMode;

    let taxableAmount = netInputAmount;
    let taxAmount = 0;
    let totalAmount = netInputAmount;
    if (effectiveTaxMode === TaxMode.EXCLUSIVE) {
      taxAmount = proportionalRound(netInputAmount, totalRateBps, 10_000);
      totalAmount = netInputAmount + taxAmount;
    } else if (effectiveTaxMode === TaxMode.INCLUSIVE) {
      taxAmount = proportionalRound(netInputAmount, totalRateBps, 10_000 + totalRateBps);
      taxableAmount = netInputAmount - taxAmount;
      totalAmount = netInputAmount;
    }

    const componentAmounts = allocateByWeights(
      taxAmount,
      activeRates.map((rate) => rate.rateBps),
    );
    const components = activeRates.map((rate, index) => ({
      taxName: rate.component,
      component: rate.component,
      taxRateBps: rate.rateBps,
      taxRate: rate.rateBps / 100,
      taxAmount: componentAmounts[index],
    }));

    return {
      menuItemId: item.menuItemId,
      menuCategoryId: menuItem.categoryId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount,
      grossAmount,
      taxableAmount,
      taxAmount,
      totalAmount,
      taxRateBps: totalRateBps,
      taxMode: effectiveTaxMode,
      taxRuleId: mapping?.taxRule.id,
      taxGroupId: mapping?.taxRule.taxGroupId,
      mappingTarget: mapping?.target,
      components,
    };
  }

  private async resolveRuleMapping(
    tx: TxClient,
    tenantId: string,
    profileId: string,
    menuItem: MenuItemForTax,
    calculatedAt: Date,
  ): Promise<RuleMappingForTax | undefined> {
    for (const target of [
      TaxMappingTarget.ITEM,
      TaxMappingTarget.CATEGORY,
      TaxMappingTarget.TENANT_DEFAULT,
    ]) {
      const mappings = await tx.taxCategoryMapping.findMany({
        where: {
          tenantId,
          target,
          isActive: true,
          menuItemId: target === TaxMappingTarget.ITEM ? menuItem.id : undefined,
          menuCategoryId: target === TaxMappingTarget.CATEGORY ? menuItem.categoryId : undefined,
          effectiveFrom: { lte: calculatedAt },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: calculatedAt } }],
          taxRule: {
            profileId,
            status: TaxRuleStatus.ACTIVE,
            effectiveFrom: { lte: calculatedAt },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: calculatedAt } }],
          },
        },
        include: {
          taxRule: {
            include: {
              taxGroup: {
                include: {
                  rates: { include: { rate: true }, orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
        },
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      });
      const eligible = mappings
        .filter((mapping) => this.isActiveGroup(mapping.taxRule.taxGroup, calculatedAt))
        .sort((left, right) => left.taxRule.priority - right.taxRule.priority);
      if (eligible[0] !== undefined) return eligible[0];
    }
    return undefined;
  }

  private isActiveGroup(group: RuleMappingForTax['taxRule']['taxGroup'], at: Date): boolean {
    return (
      group.status === TaxRateStatus.ACTIVE &&
      group.effectiveFrom <= at &&
      (group.effectiveTo === null || group.effectiveTo > at)
    );
  }

  private isActiveRate(rate: RateForTax, at: Date): boolean {
    return (
      rate.status === TaxGroupStatus.ACTIVE &&
      rate.effectiveFrom <= at &&
      (rate.effectiveTo === null || rate.effectiveTo > at)
    );
  }

  private billTaxes(lines: TaxCalculationLine[]) {
    const groups = new Map<string, { taxName: string; taxRate: number; taxAmount: number }>();
    for (const component of lines.flatMap((line) => line.components)) {
      const key = `${component.taxName}:${component.taxRateBps}`;
      const current = groups.get(key);
      groups.set(key, {
        taxName: component.taxName,
        taxRate: component.taxRate,
        taxAmount: (current?.taxAmount ?? 0) + component.taxAmount,
      });
    }
    return [...groups.values()].sort(
      (left, right) => left.taxName.localeCompare(right.taxName) || left.taxRate - right.taxRate,
    );
  }

  private toResponse(result: TaxCalculationResult) {
    return {
      tenantId: result.tenantId,
      outletId: result.outletId,
      businessDate: this.isoDate(result.businessDate),
      currencyCode: result.currencyCode,
      calculatedAt: result.calculatedAt.toISOString(),
      taxProfileId: result.taxProfileId,
      outletFiscalPolicyId: result.outletFiscalPolicyId,
      taxMode: result.taxMode,
      subtotalAmount: result.subtotalAmount,
      discountAmount: result.discountAmount,
      taxableAmount: result.taxableAmount,
      taxAmount: result.taxAmount,
      totalAmount: result.totalAmount,
      lines: result.lines,
      billTaxes: result.billTaxes,
    };
  }

  private parseDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid businessDate');
    return this.businessDate(parsed);
  }

  private businessDate(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  private isoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}

export function proportionalRound(amount: number, numerator: number, denominator: number): number {
  if (amount === 0 || numerator === 0) return 0;
  return Math.round((amount * numerator) / denominator);
}

export function allocateByWeights(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const positiveWeightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total === 0 || positiveWeightTotal === 0) return weights.map(() => 0);

  const allocations = weights.map((weight, index) => {
    const raw = (total * Math.max(0, weight)) / positiveWeightTotal;
    const floor = Math.floor(raw);
    return { index, value: floor, remainder: raw - floor };
  });
  let remaining = total - allocations.reduce((sum, allocation) => sum + allocation.value, 0);
  allocations
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
    .forEach((allocation) => {
      if (remaining > 0) {
        allocation.value += 1;
        remaining -= 1;
      }
    });
  return allocations
    .sort((left, right) => left.index - right.index)
    .map((allocation) => allocation.value);
}
