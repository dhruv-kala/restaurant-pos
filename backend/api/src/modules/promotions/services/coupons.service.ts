import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  CouponStatus,
  CouponType,
  DiscountValueType,
  Prisma,
  type Coupon,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CouponQueryDto,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from '../dto/coupon.dto';
import {
  requireCouponManage,
  requireCouponRead,
  requireCouponValidate,
  resolvePromotionsScope,
  type PromotionsScope,
} from './promotions-access.util';

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateCouponDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireCouponManage(actor);
    const scope = resolvePromotionsScope(actor, dto.tenantId, dto.outletId);
    const code = normalizeCouponCode(dto.code);
    this.assertValidity(dto.startsAt, dto.endsAt);
    this.assertCouponValue(dto);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.assertScopeRecords(tx, scope.tenantId, scope.outletId, dto);
      const existing = await tx.coupon.findUnique({
        where: { tenantId_code: { tenantId: scope.tenantId, code } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Coupon code already exists for this tenant');
      }

      const coupon = await tx.coupon.create({
        data: {
          tenantId: scope.tenantId,
          outletId: scope.outletId ?? null,
          code,
          name: this.requiredText(dto.name, 'Coupon name'),
          description: this.optionalText(dto.description),
          couponType: dto.couponType,
          discountPolicyId: dto.discountPolicyId ?? null,
          valueType: this.valueTypeFor(dto),
          percentageBps: this.percentageFor(dto),
          amountMinor: this.amountFor(dto),
          currencyCode: this.currencyFor(dto),
          maxDiscountMinor: this.maxDiscountFor(dto),
          targetMenuCategoryId: dto.targetMenuCategoryId ?? null,
          targetMenuItemId: dto.targetMenuItemId ?? null,
          freeItemMenuItemId: dto.freeItemMenuItemId ?? null,
          startsAt: this.optionalDate(dto.startsAt),
          endsAt: this.optionalDate(dto.endsAt),
          totalUsageLimit: dto.totalUsageLimit ?? null,
          perCustomerUsageLimit: dto.perCustomerUsageLimit ?? null,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
      });
      await this.auditCoupon(tx, coupon, actor, request, 'promotions.coupon.created');
      return this.couponResponse(coupon);
    });
  }

  async list(query: CouponQueryDto, actor: AuthenticatedUser) {
    requireCouponRead(actor);
    const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.couponWhere(query, scope);
      const [coupons, total] = await Promise.all([
        tx.coupon.findMany({
          where,
          orderBy: [{ code: 'asc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.coupon.count({ where }),
      ]);
      return {
        data: coupons.map((coupon) => this.couponResponse(coupon)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: CouponQueryDto, actor: AuthenticatedUser) {
    requireCouponRead(actor);
    const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const coupon = await this.findCoupon(tx, scope, id);
      return this.couponResponse(coupon);
    });
  }

  async update(
    id: string,
    dto: UpdateCouponDto,
    query: CouponQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCouponManage(actor);
    return this.prisma.$transaction(async (tx) => {
      const initialScope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
      await applyDatabaseRequestContext(tx, actor, initialScope.tenantId);
      const existing = await this.findCoupon(tx, initialScope, id);
      if (initialScope.managerOutletOnly && existing.outletId !== initialScope.outletId) {
        throw new ForbiddenException('Managers can manage only outlet-scoped coupons');
      }
      const next = this.nextCouponValues(existing, dto);
      this.assertValidity(next.startsAt?.toISOString(), next.endsAt?.toISOString());
      this.assertCouponValue(next);
      const scope = resolvePromotionsScope(actor, existing.tenantId, next.outletId);
      await this.assertScopeRecords(tx, scope.tenantId, next.outletId, next);

      const changed = await tx.coupon.updateMany({
        where: { tenantId: existing.tenantId, id, version: dto.version },
        data: {
          outletId: next.outletId,
          name: next.name,
          description: next.description,
          status: next.status,
          discountPolicyId: next.discountPolicyId,
          valueType: next.valueType,
          percentageBps: next.percentageBps,
          amountMinor: next.amountMinor,
          currencyCode: next.currencyCode,
          maxDiscountMinor: next.maxDiscountMinor,
          targetMenuCategoryId: next.targetMenuCategoryId,
          targetMenuItemId: next.targetMenuItemId,
          freeItemMenuItemId: next.freeItemMenuItemId,
          startsAt: next.startsAt,
          endsAt: next.endsAt,
          totalUsageLimit: next.totalUsageLimit,
          perCustomerUsageLimit: next.perCustomerUsageLimit,
          metadata: next.metadata as Prisma.InputJsonValue | undefined,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Coupon was updated by another request');
      }
      const coupon = await tx.coupon.findUniqueOrThrow({ where: { id } });
      await this.auditCoupon(tx, coupon, actor, request, 'promotions.coupon.updated');
      return this.couponResponse(coupon);
    });
  }

  async validate(dto: ValidateCouponDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireCouponValidate(actor);
    const scope = resolvePromotionsScope(actor, dto.tenantId, dto.outletId);
    const code = normalizeCouponCode(dto.code);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const coupon = await tx.coupon.findFirst({
        where: {
          tenantId: scope.tenantId,
          code,
          ...(scope.managerOutletOnly
            ? { OR: [{ outletId: null }, { outletId: scope.outletId }] }
            : scope.outletId
              ? { OR: [{ outletId: null }, { outletId: scope.outletId }] }
              : {}),
        },
      });
      if (!coupon) throw new NotFoundException('Coupon not found');
      await this.assertCustomer(tx, scope.tenantId, dto.customerId);
      this.assertCouponUsable(coupon, dto);
      await this.auditCoupon(tx, coupon, actor, request, 'promotions.coupon.validated');
      return this.validationResponse(coupon, dto);
    });
  }

  private couponWhere(query: CouponQueryDto, scope: PromotionsScope): Prisma.CouponWhereInput {
    const search = query.search?.trim();
    const and: Prisma.CouponWhereInput[] = [];
    if (scope.managerOutletOnly) {
      and.push({ OR: [{ outletId: null }, { outletId: scope.outletId }] });
    } else if (scope.outletId) {
      and.push({ outletId: scope.outletId });
    }
    if (search) {
      and.push({
        OR: [
          { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    return {
      tenantId: scope.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.couponType ? { couponType: query.couponType } : {}),
      ...(and.length > 0 ? { AND: and } : {}),
    };
  }

  private async findCoupon(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    id: string,
  ): Promise<Coupon> {
    const coupon = await tx.coupon.findFirst({
      where: {
        tenantId: scope.tenantId,
        id,
        ...(scope.managerOutletOnly
          ? { OR: [{ outletId: null }, { outletId: scope.outletId }] }
          : scope.outletId
            ? { outletId: scope.outletId }
            : {}),
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  private async assertScopeRecords(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string | null | undefined,
    input: {
      discountPolicyId?: string | null;
      targetMenuCategoryId?: string | null;
      targetMenuItemId?: string | null;
      freeItemMenuItemId?: string | null;
    },
  ): Promise<void> {
    if (outletId) {
      const outlet = await tx.outlet.findFirst({
        where: { tenantId, id: outletId, deletedAt: null },
        select: { id: true },
      });
      if (!outlet) throw new BadRequestException('Outlet is not active for this tenant');
    }
    if (input.discountPolicyId) {
      const policy = await tx.discountPolicy.findFirst({
        where: { tenantId, id: input.discountPolicyId },
        select: { id: true },
      });
      if (!policy) throw new BadRequestException('Discount policy is not valid for this tenant');
    }
    if (input.targetMenuCategoryId) {
      const category = await tx.menuCategory.findFirst({
        where: { tenantId, id: input.targetMenuCategoryId, deletedAt: null },
        select: { id: true },
      });
      if (!category) throw new BadRequestException('Target menu category is not active');
    }
    for (const [label, itemId] of [
      ['Target menu item', input.targetMenuItemId],
      ['Free item menu item', input.freeItemMenuItemId],
    ] as const) {
      if (!itemId) continue;
      const item = await tx.menuItem.findFirst({
        where: { tenantId, id: itemId, deletedAt: null },
        select: { id: true },
      });
      if (!item) throw new BadRequestException(`${label} is not active`);
    }
  }

  private async assertCustomer(
    tx: Prisma.TransactionClient,
    tenantId: string,
    customerId?: string,
  ): Promise<void> {
    if (!customerId) return;
    const customer = await tx.customer.findFirst({
      where: { tenantId, id: customerId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new BadRequestException('Customer is not active for this tenant');
  }

  private assertCouponUsable(coupon: Coupon, dto: ValidateCouponDto): void {
    if (coupon.status !== CouponStatus.ACTIVE) throw new ConflictException('Coupon is inactive');
    const now = Date.now();
    if (coupon.startsAt && coupon.startsAt.getTime() > now) {
      throw new ConflictException('Coupon is not active yet');
    }
    if (coupon.endsAt && coupon.endsAt.getTime() <= now) {
      throw new ConflictException('Coupon has expired');
    }
    if (coupon.totalUsageLimit !== null && coupon.currentUsageCount >= coupon.totalUsageLimit) {
      throw new ConflictException('Coupon usage limit has been reached');
    }
    if (coupon.currencyCode && dto.currencyCode && coupon.currencyCode !== dto.currencyCode) {
      throw new BadRequestException('Coupon currency does not match validation currency');
    }
  }

  private assertCouponValue(input: {
    couponType: CouponType;
    valueType?: DiscountValueType | null;
    percentageBps?: number | null;
    amountMinor?: number | null;
    currencyCode?: string | null;
    targetMenuCategoryId?: string | null;
    targetMenuItemId?: string | null;
    freeItemMenuItemId?: string | null;
  }): void {
    if (input.couponType === CouponType.FREE_ITEM) {
      if (
        !input.freeItemMenuItemId ||
        input.valueType ||
        input.percentageBps ||
        input.amountMinor ||
        input.currencyCode
      ) {
        throw new BadRequestException('Free-item coupons require only freeItemMenuItemId');
      }
      return;
    }
    if (input.couponType === CouponType.CATEGORY && !input.targetMenuCategoryId) {
      throw new BadRequestException('Category coupons require targetMenuCategoryId');
    }
    if (input.couponType === CouponType.ITEM && !input.targetMenuItemId) {
      throw new BadRequestException('Item coupons require targetMenuItemId');
    }
    if (input.valueType === DiscountValueType.PERCENTAGE) {
      if (!input.percentageBps || input.amountMinor || input.currencyCode) {
        throw new BadRequestException('Percentage coupons require only percentageBps');
      }
      return;
    }
    if (input.valueType === DiscountValueType.FIXED_AMOUNT) {
      if (!input.amountMinor || !input.currencyCode || input.percentageBps) {
        throw new BadRequestException('Fixed amount coupons require amountMinor and currencyCode');
      }
      return;
    }
    throw new BadRequestException('Coupon value type is required');
  }

  private assertValidity(startsAt?: string | null, endsAt?: string | null): void {
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  private nextCouponValues(existing: Coupon, dto: UpdateCouponDto) {
    const valueType = dto.valueType === undefined ? existing.valueType : dto.valueType;
    return {
      outletId: dto.outletId === undefined ? existing.outletId : dto.outletId,
      name: dto.name === undefined ? existing.name : this.requiredText(dto.name, 'Coupon name'),
      description:
        dto.description === undefined ? existing.description : this.optionalText(dto.description),
      couponType: existing.couponType,
      status: dto.status ?? existing.status,
      discountPolicyId:
        dto.discountPolicyId === undefined ? existing.discountPolicyId : dto.discountPolicyId,
      valueType,
      percentageBps:
        valueType === DiscountValueType.PERCENTAGE
          ? (dto.percentageBps ?? existing.percentageBps)
          : null,
      amountMinor:
        valueType === DiscountValueType.FIXED_AMOUNT
          ? (dto.amountMinor ?? existing.amountMinor)
          : null,
      currencyCode:
        valueType === DiscountValueType.FIXED_AMOUNT
          ? (dto.currencyCode ?? existing.currencyCode)
          : null,
      maxDiscountMinor:
        dto.maxDiscountMinor === undefined ? existing.maxDiscountMinor : dto.maxDiscountMinor,
      targetMenuCategoryId:
        dto.targetMenuCategoryId === undefined
          ? existing.targetMenuCategoryId
          : dto.targetMenuCategoryId,
      targetMenuItemId:
        dto.targetMenuItemId === undefined ? existing.targetMenuItemId : dto.targetMenuItemId,
      freeItemMenuItemId:
        dto.freeItemMenuItemId === undefined ? existing.freeItemMenuItemId : dto.freeItemMenuItemId,
      startsAt: dto.startsAt === undefined ? existing.startsAt : this.optionalDate(dto.startsAt),
      endsAt: dto.endsAt === undefined ? existing.endsAt : this.optionalDate(dto.endsAt),
      totalUsageLimit:
        dto.totalUsageLimit === undefined ? existing.totalUsageLimit : dto.totalUsageLimit,
      perCustomerUsageLimit:
        dto.perCustomerUsageLimit === undefined
          ? existing.perCustomerUsageLimit
          : dto.perCustomerUsageLimit,
      metadata: dto.metadata === undefined ? existing.metadata : dto.metadata,
    };
  }

  private async auditCoupon(
    tx: Prisma.TransactionClient,
    coupon: Coupon,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: coupon.tenantId,
      outletId: coupon.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'Coupon',
      targetId: coupon.id,
      result: AuditResult.SUCCESS,
      metadata: {
        code: coupon.code,
        couponType: coupon.couponType,
        status: coupon.status,
        totalUsageLimit: coupon.totalUsageLimit,
        currentUsageCount: coupon.currentUsageCount,
      },
      ...request,
    });
  }

  private couponResponse(coupon: Coupon) {
    return {
      id: coupon.id,
      tenantId: coupon.tenantId,
      outletId: coupon.outletId,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      couponType: coupon.couponType,
      status: coupon.status,
      discountPolicyId: coupon.discountPolicyId,
      valueType: coupon.valueType,
      percentageBps: coupon.percentageBps,
      amountMinor: coupon.amountMinor,
      currencyCode: coupon.currencyCode,
      maxDiscountMinor: coupon.maxDiscountMinor,
      targetMenuCategoryId: coupon.targetMenuCategoryId,
      targetMenuItemId: coupon.targetMenuItemId,
      freeItemMenuItemId: coupon.freeItemMenuItemId,
      startsAt: coupon.startsAt?.toISOString() ?? null,
      endsAt: coupon.endsAt?.toISOString() ?? null,
      totalUsageLimit: coupon.totalUsageLimit,
      perCustomerUsageLimit: coupon.perCustomerUsageLimit,
      currentUsageCount: coupon.currentUsageCount,
      metadata: coupon.metadata,
      version: coupon.version,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }

  private validationResponse(coupon: Coupon, dto: ValidateCouponDto) {
    const discountAmountMinor = this.validationDiscountAmount(coupon, dto);
    return {
      valid: true,
      coupon: this.couponResponse(coupon),
      calculation:
        discountAmountMinor === null || dto.baseAmountMinor === undefined
          ? null
          : {
              baseAmountMinor: dto.baseAmountMinor,
              discountAmountMinor,
              finalAmountMinor: dto.baseAmountMinor - discountAmountMinor,
              currencyCode: dto.currencyCode ?? coupon.currencyCode,
            },
      usage: {
        totalUsageLimit: coupon.totalUsageLimit,
        perCustomerUsageLimit: coupon.perCustomerUsageLimit,
        currentUsageCount: coupon.currentUsageCount,
      },
      createsRedemption: false,
    };
  }

  private validationDiscountAmount(coupon: Coupon, dto: ValidateCouponDto): number | null {
    if (dto.baseAmountMinor === undefined) return null;
    if (coupon.valueType === DiscountValueType.PERCENTAGE && coupon.percentageBps !== null) {
      const raw = Math.floor((dto.baseAmountMinor * coupon.percentageBps) / 10_000);
      const cappedByBase = Math.min(raw, dto.baseAmountMinor);
      return coupon.maxDiscountMinor === null
        ? cappedByBase
        : Math.min(cappedByBase, coupon.maxDiscountMinor);
    }
    if (coupon.valueType === DiscountValueType.FIXED_AMOUNT && coupon.amountMinor !== null) {
      const cappedByBase = Math.min(coupon.amountMinor, dto.baseAmountMinor);
      return coupon.maxDiscountMinor === null
        ? cappedByBase
        : Math.min(cappedByBase, coupon.maxDiscountMinor);
    }
    return null;
  }

  private valueTypeFor(input: CreateCouponDto): DiscountValueType | null {
    return input.couponType === CouponType.FREE_ITEM ? null : (input.valueType ?? null);
  }

  private percentageFor(input: CreateCouponDto): number | null {
    return this.valueTypeFor(input) === DiscountValueType.PERCENTAGE
      ? (input.percentageBps ?? null)
      : null;
  }

  private amountFor(input: CreateCouponDto): number | null {
    return this.valueTypeFor(input) === DiscountValueType.FIXED_AMOUNT
      ? (input.amountMinor ?? null)
      : null;
  }

  private currencyFor(input: CreateCouponDto): string | null {
    return this.valueTypeFor(input) === DiscountValueType.FIXED_AMOUNT
      ? (input.currencyCode ?? null)
      : null;
  }

  private maxDiscountFor(input: CreateCouponDto): number | null {
    return input.couponType === CouponType.FREE_ITEM ? null : (input.maxDiscountMinor ?? null);
  }

  private requiredText(value: string, label: string): string {
    const trimmed = value.trim();
    if (!trimmed) throw new BadRequestException(`${label} is required`);
    return trimmed;
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private optionalDate(value?: string | null): Date | null {
    return value ? new Date(value) : null;
  }
}

function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}
