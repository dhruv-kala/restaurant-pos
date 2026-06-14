import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  DiscountValueType,
  Prisma,
  PromotionCampaignOutletScope,
  PromotionCampaignStatus,
  PromotionRuleType,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  ChangePromotionCampaignStatusDto,
  CreatePromotionCampaignDto,
  EvaluatePromotionCampaignsDto,
  PromotionCampaignQueryDto,
  PromotionRuleInputDto,
  UpdatePromotionCampaignDto,
} from '../dto/promotion-campaign.dto';
import {
  requireCampaignManage,
  requireCampaignRead,
  resolvePromotionsScope,
  type PromotionsScope,
} from './promotions-access.util';

const campaignInclude = {
  outlets: { orderBy: { outletId: 'asc' as const } },
  rules: { orderBy: [{ priority: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.PromotionCampaignInclude;

type CampaignRecord = Prisma.PromotionCampaignGetPayload<{
  include: typeof campaignInclude;
}>;
type CampaignRuleRecord = CampaignRecord['rules'][number];

@Injectable()
export class PromotionCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreatePromotionCampaignDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCampaignManage(actor);
    const scope = resolvePromotionsScope(actor, dto.tenantId);
    const code = dto.code.trim().toLowerCase();
    this.assertCampaignPeriod(dto.startsAt, dto.endsAt);
    this.assertOutletScopeForActor(scope, dto.outletScope, dto.outletIds);
    this.assertRules(dto.rules);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.assertOutlets(tx, scope.tenantId, dto.outletScope, dto.outletIds);
      await this.assertRuleReferences(tx, scope.tenantId, dto.rules);
      const existing = await tx.promotionCampaign.findUnique({
        where: { tenantId_code: { tenantId: scope.tenantId, code } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Promotion campaign code already exists');
      }

      const campaign = await tx.promotionCampaign.create({
        data: {
          tenantId: scope.tenantId,
          code,
          name: this.requiredText(dto.name, 'Campaign name'),
          description: this.optionalText(dto.description),
          outletScope: dto.outletScope,
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          priority: dto.priority,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
          outlets:
            dto.outletScope === PromotionCampaignOutletScope.SELECTED_OUTLETS
              ? {
                  create: unique(dto.outletIds).map((outletId) => ({
                    tenantId: scope.tenantId,
                    outletId,
                  })),
                }
              : undefined,
          rules: {
            create: dto.rules.map((rule) => this.ruleCreateData(scope.tenantId, rule)),
          },
        },
        include: campaignInclude,
      });
      await this.auditCampaign(tx, campaign, actor, request, 'promotions.campaign.created');
      return this.campaignResponse(campaign);
    });
  }

  async list(query: PromotionCampaignQueryDto, actor: AuthenticatedUser) {
    requireCampaignRead(actor);
    const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.campaignWhere(query, scope);
      const [campaigns, total] = await Promise.all([
        tx.promotionCampaign.findMany({
          where,
          include: campaignInclude,
          orderBy: [{ priority: 'asc' }, { startsAt: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.promotionCampaign.count({ where }),
      ]);
      return {
        data: campaigns.map((campaign) => this.campaignResponse(campaign)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: PromotionCampaignQueryDto, actor: AuthenticatedUser) {
    requireCampaignRead(actor);
    const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.campaignResponse(await this.findCampaign(tx, scope, id));
    });
  }

  async update(
    id: string,
    dto: UpdatePromotionCampaignDto,
    query: PromotionCampaignQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireCampaignManage(actor);
    return this.prisma.$transaction(async (tx) => {
      const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findCampaign(tx, scope, id);
      this.assertCampaignManageScope(scope, existing);
      const nextOutletScope = dto.outletScope ?? existing.outletScope;
      const nextOutletIds =
        dto.outletIds ??
        (nextOutletScope === PromotionCampaignOutletScope.SELECTED_OUTLETS
          ? existing.outlets.map((outlet) => outlet.outletId)
          : []);
      const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
      const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
      this.assertCampaignPeriod(startsAt.toISOString(), endsAt.toISOString());
      this.assertOutletScopeForActor(scope, nextOutletScope, nextOutletIds);
      if (dto.rules) this.assertRules(dto.rules);
      await this.assertOutlets(tx, existing.tenantId, nextOutletScope, nextOutletIds);
      if (dto.rules) await this.assertRuleReferences(tx, existing.tenantId, dto.rules);

      const changed = await tx.promotionCampaign.updateMany({
        where: { tenantId: existing.tenantId, id, version: dto.version },
        data: {
          name:
            dto.name === undefined ? existing.name : this.requiredText(dto.name, 'Campaign name'),
          description:
            dto.description === undefined
              ? existing.description
              : this.optionalText(dto.description),
          outletScope: nextOutletScope,
          startsAt,
          endsAt,
          priority: dto.priority ?? existing.priority,
          metadata:
            dto.metadata === undefined
              ? (existing.metadata as Prisma.InputJsonValue | undefined)
              : (dto.metadata as Prisma.InputJsonValue | undefined),
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Promotion campaign was updated by another request');
      }
      await tx.promotionCampaignOutlet.deleteMany({
        where: { tenantId: existing.tenantId, campaignId: id },
      });
      if (nextOutletScope === PromotionCampaignOutletScope.SELECTED_OUTLETS) {
        await tx.promotionCampaignOutlet.createMany({
          data: unique(nextOutletIds).map((outletId) => ({
            tenantId: existing.tenantId,
            campaignId: id,
            outletId,
          })),
        });
      }
      if (dto.rules) {
        await tx.promotionRule.deleteMany({
          where: { tenantId: existing.tenantId, campaignId: id },
        });
        await tx.promotionRule.createMany({
          data: dto.rules.map((rule) => ({
            ...this.ruleCreateData(existing.tenantId, rule),
            campaignId: id,
          })),
        });
      }
      const campaign = await this.findCampaign(tx, scope, id);
      await this.auditCampaign(tx, campaign, actor, request, 'promotions.campaign.updated');
      return this.campaignResponse(campaign);
    });
  }

  async activate(
    id: string,
    dto: ChangePromotionCampaignStatusDto,
    query: PromotionCampaignQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    return this.changeStatus(
      id,
      dto,
      query,
      actor,
      request,
      PromotionCampaignStatus.ACTIVE,
      'promotions.campaign.activated',
    );
  }

  async deactivate(
    id: string,
    dto: ChangePromotionCampaignStatusDto,
    query: PromotionCampaignQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    return this.changeStatus(
      id,
      dto,
      query,
      actor,
      request,
      PromotionCampaignStatus.INACTIVE,
      'promotions.campaign.deactivated',
    );
  }

  async evaluate(dto: EvaluatePromotionCampaignsDto, actor: AuthenticatedUser) {
    requireCampaignRead(actor);
    const scope = resolvePromotionsScope(actor, dto.tenantId, dto.outletId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const now = new Date();
      const campaigns = await tx.promotionCampaign.findMany({
        where: {
          tenantId: scope.tenantId,
          status: PromotionCampaignStatus.ACTIVE,
          startsAt: { lte: now },
          endsAt: { gt: now },
          ...(scope.outletId
            ? {
                OR: [
                  { outletScope: PromotionCampaignOutletScope.ALL_OUTLETS },
                  {
                    outletScope: PromotionCampaignOutletScope.SELECTED_OUTLETS,
                    outlets: { some: { outletId: scope.outletId } },
                  },
                ],
              }
            : {}),
        },
        include: campaignInclude,
        orderBy: [{ priority: 'asc' }, { startsAt: 'asc' }],
      });
      return {
        data: campaigns
          .map((campaign) => this.evaluationResponse(campaign, dto))
          .filter((campaign) => campaign.rules.length > 0),
        createsRedemption: false,
      };
    });
  }

  private async changeStatus(
    id: string,
    dto: ChangePromotionCampaignStatusDto,
    query: PromotionCampaignQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    status: PromotionCampaignStatus,
    action: string,
  ) {
    requireCampaignManage(actor);
    return this.prisma.$transaction(async (tx) => {
      const scope = resolvePromotionsScope(actor, query.tenantId, query.outletId);
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findCampaign(tx, scope, id);
      this.assertCampaignManageScope(scope, existing);
      if (status === PromotionCampaignStatus.ACTIVE) this.assertActivatable(existing);
      const changed = await tx.promotionCampaign.updateMany({
        where: { tenantId: existing.tenantId, id, version: dto.version },
        data: { status, updatedByUserId: actor.id, version: { increment: 1 } },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Promotion campaign was updated by another request');
      }
      const campaign = await this.findCampaign(tx, scope, id);
      await this.auditCampaign(tx, campaign, actor, request, action);
      return this.campaignResponse(campaign);
    });
  }

  private campaignWhere(
    query: PromotionCampaignQueryDto,
    scope: PromotionsScope,
  ): Prisma.PromotionCampaignWhereInput {
    const and: Prisma.PromotionCampaignWhereInput[] = [];
    if (scope.managerOutletOnly) {
      and.push({
        OR: [
          { outletScope: PromotionCampaignOutletScope.ALL_OUTLETS },
          { outlets: { some: { outletId: scope.outletId } } },
        ],
      });
    } else if (scope.outletId) {
      and.push({
        OR: [
          { outletScope: PromotionCampaignOutletScope.ALL_OUTLETS },
          { outlets: { some: { outletId: scope.outletId } } },
        ],
      });
    }
    const search = query.search?.trim();
    if (search) {
      and.push({
        OR: [
          { code: { contains: search.toLowerCase(), mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    return {
      tenantId: scope.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(and.length > 0 ? { AND: and } : {}),
    };
  }

  private async findCampaign(
    tx: Prisma.TransactionClient,
    scope: PromotionsScope,
    id: string,
  ): Promise<CampaignRecord> {
    const campaign = await tx.promotionCampaign.findFirst({
      where: {
        tenantId: scope.tenantId,
        id,
        ...(scope.managerOutletOnly
          ? {
              OR: [
                { outletScope: PromotionCampaignOutletScope.ALL_OUTLETS },
                { outlets: { some: { outletId: scope.outletId } } },
              ],
            }
          : scope.outletId
            ? {
                OR: [
                  { outletScope: PromotionCampaignOutletScope.ALL_OUTLETS },
                  { outlets: { some: { outletId: scope.outletId } } },
                ],
              }
            : {}),
      },
      include: campaignInclude,
    });
    if (!campaign) throw new NotFoundException('Promotion campaign not found');
    return campaign;
  }

  private assertCampaignManageScope(scope: PromotionsScope, campaign: CampaignRecord): void {
    if (
      !scope.managerOutletOnly ||
      (campaign.outletScope === PromotionCampaignOutletScope.SELECTED_OUTLETS &&
        campaign.outlets.some((outlet) => outlet.outletId === scope.outletId))
    ) {
      return;
    }
    throw new ForbiddenException('Managers can manage only selected-outlet campaigns');
  }

  private assertOutletScopeForActor(
    scope: PromotionsScope,
    outletScope: PromotionCampaignOutletScope,
    outletIds: string[],
  ): void {
    const outletSet = unique(outletIds);
    if (outletScope === PromotionCampaignOutletScope.SELECTED_OUTLETS && outletSet.length === 0) {
      throw new BadRequestException('Selected-outlet campaigns require at least one outlet');
    }
    if (outletScope === PromotionCampaignOutletScope.ALL_OUTLETS && outletSet.length > 0) {
      throw new BadRequestException('All-outlet campaigns must not include outletIds');
    }
    if (scope.managerOutletOnly) {
      if (
        outletScope !== PromotionCampaignOutletScope.SELECTED_OUTLETS ||
        outletSet.length !== 1 ||
        outletSet[0] !== scope.outletId
      ) {
        throw new ForbiddenException('Managers can create campaigns only for their outlet');
      }
    }
  }

  private assertCampaignPeriod(startsAt: string, endsAt: string): void {
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  private assertRules(rules: PromotionRuleInputDto[]): void {
    if (rules.length === 0) {
      throw new BadRequestException('At least one promotion rule is required');
    }
    rules.forEach((rule) => this.assertRuleValue(rule));
  }

  private assertRuleValue(input: PromotionRuleInputDto | CampaignRuleRecord): void {
    if (input.ruleType === PromotionRuleType.FREE_ITEM) {
      if (
        !input.freeItemMenuItemId ||
        input.valueType ||
        input.percentageBps ||
        input.amountMinor ||
        input.currencyCode
      ) {
        throw new BadRequestException('Free-item rules require only freeItemMenuItemId');
      }
      return;
    }
    if (input.ruleType === PromotionRuleType.CATEGORY && !input.targetMenuCategoryId) {
      throw new BadRequestException('Category rules require targetMenuCategoryId');
    }
    if (input.ruleType === PromotionRuleType.ITEM && !input.targetMenuItemId) {
      throw new BadRequestException('Item rules require targetMenuItemId');
    }
    if (input.valueType === DiscountValueType.PERCENTAGE) {
      if (!input.percentageBps || input.amountMinor || input.currencyCode) {
        throw new BadRequestException('Percentage rules require only percentageBps');
      }
      return;
    }
    if (input.valueType === DiscountValueType.FIXED_AMOUNT) {
      if (!input.amountMinor || !input.currencyCode || input.percentageBps) {
        throw new BadRequestException('Fixed amount rules require amountMinor and currencyCode');
      }
      return;
    }
    throw new BadRequestException('Promotion rule value type is required');
  }

  private async assertOutlets(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletScope: PromotionCampaignOutletScope,
    outletIds: string[],
  ): Promise<void> {
    if (outletScope !== PromotionCampaignOutletScope.SELECTED_OUTLETS) return;
    const ids = unique(outletIds);
    const outlets = await tx.outlet.findMany({
      where: { tenantId, id: { in: ids }, deletedAt: null },
      select: { id: true },
    });
    if (outlets.length !== ids.length) {
      throw new BadRequestException('One or more selected outlets are not active');
    }
  }

  private async assertRuleReferences(
    tx: Prisma.TransactionClient,
    tenantId: string,
    rules: PromotionRuleInputDto[],
  ): Promise<void> {
    for (const rule of rules) {
      if (rule.discountPolicyId) {
        const policy = await tx.discountPolicy.findFirst({
          where: { tenantId, id: rule.discountPolicyId },
          select: { id: true },
        });
        if (!policy) throw new BadRequestException('Discount policy is not valid for this tenant');
      }
      if (rule.targetMenuCategoryId) {
        const category = await tx.menuCategory.findFirst({
          where: { tenantId, id: rule.targetMenuCategoryId, deletedAt: null },
          select: { id: true },
        });
        if (!category) throw new BadRequestException('Target menu category is not active');
      }
      for (const [label, itemId] of [
        ['Target menu item', rule.targetMenuItemId],
        ['Free item menu item', rule.freeItemMenuItemId],
      ] as const) {
        if (!itemId) continue;
        const item = await tx.menuItem.findFirst({
          where: { tenantId, id: itemId, deletedAt: null },
          select: { id: true },
        });
        if (!item) throw new BadRequestException(`${label} is not active`);
      }
    }
  }

  private assertActivatable(campaign: CampaignRecord): void {
    if (
      campaign.outletScope === PromotionCampaignOutletScope.SELECTED_OUTLETS &&
      campaign.outlets.length === 0
    ) {
      throw new ConflictException('Selected-outlet campaigns require outlet targets');
    }
    if (!campaign.rules.some((rule) => rule.isActive)) {
      throw new ConflictException('Promotion campaign requires at least one active rule');
    }
  }

  private ruleCreateData(tenantId: string, rule: PromotionRuleInputDto) {
    return {
      tenantId,
      ruleType: rule.ruleType,
      name: this.requiredText(rule.name, 'Rule name'),
      description: this.optionalText(rule.description),
      discountPolicyId: rule.discountPolicyId ?? null,
      valueType: rule.ruleType === PromotionRuleType.FREE_ITEM ? null : (rule.valueType ?? null),
      percentageBps:
        rule.valueType === DiscountValueType.PERCENTAGE ? (rule.percentageBps ?? null) : null,
      amountMinor:
        rule.valueType === DiscountValueType.FIXED_AMOUNT ? (rule.amountMinor ?? null) : null,
      currencyCode:
        rule.valueType === DiscountValueType.FIXED_AMOUNT ? (rule.currencyCode ?? null) : null,
      maxDiscountMinor:
        rule.ruleType === PromotionRuleType.FREE_ITEM ? null : (rule.maxDiscountMinor ?? null),
      minimumSubtotalMinor: rule.minimumSubtotalMinor ?? null,
      targetMenuCategoryId: rule.targetMenuCategoryId ?? null,
      targetMenuItemId: rule.targetMenuItemId ?? null,
      freeItemMenuItemId: rule.freeItemMenuItemId ?? null,
      priority: rule.priority ?? 100,
      isActive: rule.isActive ?? true,
      metadata: rule.metadata as Prisma.InputJsonValue | undefined,
    };
  }

  private evaluationResponse(campaign: CampaignRecord, dto: EvaluatePromotionCampaignsDto) {
    return {
      campaign: this.campaignResponse(campaign),
      rules: campaign.rules
        .filter((rule) => rule.isActive)
        .filter(
          (rule) =>
            rule.minimumSubtotalMinor === null ||
            dto.subtotalMinor === undefined ||
            dto.subtotalMinor >= rule.minimumSubtotalMinor,
        )
        .filter(
          (rule) =>
            !rule.currencyCode || !dto.currencyCode || rule.currencyCode === dto.currencyCode,
        )
        .map((rule) => ({
          rule: this.ruleResponse(rule),
          calculation: this.ruleCalculation(rule, dto),
          ruleSnapshot: this.ruleSnapshot(rule),
        })),
    };
  }

  private ruleCalculation(rule: CampaignRuleRecord, dto: EvaluatePromotionCampaignsDto) {
    if (dto.subtotalMinor === undefined) return null;
    if (rule.valueType === DiscountValueType.PERCENTAGE && rule.percentageBps !== null) {
      const raw = Math.floor((dto.subtotalMinor * rule.percentageBps) / 10_000);
      const capped = Math.min(raw, dto.subtotalMinor);
      const discountAmountMinor =
        rule.maxDiscountMinor === null ? capped : Math.min(capped, rule.maxDiscountMinor);
      return {
        baseAmountMinor: dto.subtotalMinor,
        discountAmountMinor,
        finalAmountMinor: dto.subtotalMinor - discountAmountMinor,
        currencyCode: dto.currencyCode ?? rule.currencyCode,
      };
    }
    if (rule.valueType === DiscountValueType.FIXED_AMOUNT && rule.amountMinor !== null) {
      const capped = Math.min(rule.amountMinor, dto.subtotalMinor);
      const discountAmountMinor =
        rule.maxDiscountMinor === null ? capped : Math.min(capped, rule.maxDiscountMinor);
      return {
        baseAmountMinor: dto.subtotalMinor,
        discountAmountMinor,
        finalAmountMinor: dto.subtotalMinor - discountAmountMinor,
        currencyCode: dto.currencyCode ?? rule.currencyCode,
      };
    }
    return null;
  }

  private async auditCampaign(
    tx: Prisma.TransactionClient,
    campaign: CampaignRecord,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: campaign.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'PromotionCampaign',
      targetId: campaign.id,
      result: AuditResult.SUCCESS,
      metadata: {
        code: campaign.code,
        status: campaign.status,
        outletScope: campaign.outletScope,
        outletCount: campaign.outlets.length,
        ruleCount: campaign.rules.length,
      },
      ...request,
    });
  }

  private campaignResponse(campaign: CampaignRecord) {
    return {
      id: campaign.id,
      tenantId: campaign.tenantId,
      code: campaign.code,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      outletScope: campaign.outletScope,
      outletIds: campaign.outlets.map((outlet) => outlet.outletId),
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      priority: campaign.priority,
      metadata: campaign.metadata,
      rules: campaign.rules.map((rule) => this.ruleResponse(rule)),
      version: campaign.version,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }

  private ruleResponse(rule: CampaignRuleRecord) {
    return {
      id: rule.id,
      campaignId: rule.campaignId,
      ruleType: rule.ruleType,
      name: rule.name,
      description: rule.description,
      discountPolicyId: rule.discountPolicyId,
      valueType: rule.valueType,
      percentageBps: rule.percentageBps,
      amountMinor: rule.amountMinor,
      currencyCode: rule.currencyCode,
      maxDiscountMinor: rule.maxDiscountMinor,
      minimumSubtotalMinor: rule.minimumSubtotalMinor,
      targetMenuCategoryId: rule.targetMenuCategoryId,
      targetMenuItemId: rule.targetMenuItemId,
      freeItemMenuItemId: rule.freeItemMenuItemId,
      priority: rule.priority,
      isActive: rule.isActive,
      metadata: rule.metadata,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private ruleSnapshot(rule: CampaignRuleRecord) {
    return this.ruleResponse(rule);
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
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
