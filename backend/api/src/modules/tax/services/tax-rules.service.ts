import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  Prisma,
  TaxGroupStatus,
  TaxMappingTarget,
  TaxProfileStatus,
  TaxRateStatus,
  type TaxCategoryMapping,
  type TaxGroup,
  type TaxRate,
  type TaxRule,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CreateTaxCategoryMappingDto,
  CreateTaxGroupDto,
  CreateTaxRateDto,
  CreateTaxRuleDto,
  TaxConfigurationQueryDto,
  UpdateTaxCategoryMappingDto,
  UpdateTaxGroupDto,
  UpdateTaxRateDto,
  UpdateTaxRuleDto,
} from '../dto/tax-rules.dto';
import {
  requireTaxProfileManage,
  requireTaxProfileRead,
  resolveTaxScope,
  type TaxScope,
} from './tax-access.util';

type TaxGroupWithRates = TaxGroup & {
  rates: Array<{ rate: TaxRate; sortOrder: number }>;
};

type TaxRuleWithGroup = TaxRule & {
  taxGroup: TaxGroupWithRates;
};

type TaxMappingWithRule = TaxCategoryMapping & {
  taxRule: TaxRuleWithGroup;
};

@Injectable()
export class TaxRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createRate(dto: CreateTaxRateDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    const code = this.normalizedCode(dto.code);
    const effectiveFrom = this.parseDate(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo = this.parseOptionalDate(dto.effectiveTo, 'effectiveTo');
    this.assertDateRange(effectiveFrom, effectiveTo);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      await this.findActiveProfile(tx, scope.tenantId, dto.profileId);
      await this.assertCodeAvailable(tx, 'rate', scope.tenantId, dto.profileId, code);
      const rate = await tx.taxRate.create({
        data: {
          tenantId: scope.tenantId,
          profileId: dto.profileId,
          code,
          name: this.requiredText(dto.name, 'Tax rate name'),
          description: this.optionalText(dto.description),
          component: dto.component,
          taxType: dto.taxType,
          rateBps: dto.rateBps,
          effectiveFrom,
          effectiveTo,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
      });
      await this.auditTax(tx, rate, actor, request, 'tax.rate.created', 'TaxRate');
      return this.rateResponse(rate);
    });
  }

  async listRates(query: TaxConfigurationQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.baseWhere<Prisma.TaxRateWhereInput>(query, scope);
      const [rates, total] = await Promise.all([
        tx.taxRate.findMany({
          where,
          orderBy: [{ code: 'asc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.taxRate.count({ where }),
      ]);
      return this.paginated(rates.map((rate) => this.rateResponse(rate)), query, total);
    });
  }

  async detailRate(id: string, query: TaxConfigurationQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.rateResponse(await this.findRate(tx, scope.tenantId, id));
    });
  }

  async updateRate(
    id: string,
    dto: UpdateTaxRateDto,
    query: TaxConfigurationQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      const existing = await this.findRate(tx, scope.tenantId, id);
      const effectiveFrom = dto.effectiveFrom
        ? this.parseDate(dto.effectiveFrom, 'effectiveFrom')
        : existing.effectiveFrom;
      const effectiveTo =
        dto.effectiveTo === undefined
          ? existing.effectiveTo
          : this.parseOptionalDate(dto.effectiveTo, 'effectiveTo');
      this.assertDateRange(effectiveFrom, effectiveTo);
      const updated = await tx.taxRate.updateMany({
        where: { tenantId: scope.tenantId, id, version: dto.version },
        data: {
          name:
            dto.name === undefined ? existing.name : this.requiredText(dto.name, 'Tax rate name'),
          description:
            dto.description === undefined
              ? existing.description
              : this.optionalText(dto.description),
          status: dto.status ?? existing.status,
          effectiveFrom,
          effectiveTo,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Tax rate was updated by another request');
      }
      const rate = await this.findRate(tx, scope.tenantId, id);
      await this.auditTax(tx, rate, actor, request, 'tax.rate.updated', 'TaxRate');
      return this.rateResponse(rate);
    });
  }

  async createGroup(dto: CreateTaxGroupDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    const code = this.normalizedCode(dto.code);
    const effectiveFrom = this.parseDate(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo = this.parseOptionalDate(dto.effectiveTo, 'effectiveTo');
    this.assertDateRange(effectiveFrom, effectiveTo);
    const rateIds = this.uniqueIds(dto.rateIds, 'rateIds');

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      await this.findActiveProfile(tx, scope.tenantId, dto.profileId);
      await this.assertCodeAvailable(tx, 'group', scope.tenantId, dto.profileId, code);
      await this.assertRatesBelongToProfile(tx, scope.tenantId, dto.profileId, rateIds);
      const group = await tx.taxGroup.create({
        data: {
          tenantId: scope.tenantId,
          profileId: dto.profileId,
          code,
          name: this.requiredText(dto.name, 'Tax group name'),
          description: this.optionalText(dto.description),
          effectiveFrom,
          effectiveTo,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
          rates: {
            create: rateIds.map((rateId, index) => ({
              tenantId: scope.tenantId,
              rateId,
              sortOrder: index,
            })),
          },
        },
        include: this.groupInclude(),
      });
      await this.auditTax(tx, group, actor, request, 'tax.group.created', 'TaxGroup');
      return this.groupResponse(group);
    });
  }

  async listGroups(query: TaxConfigurationQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.baseWhere<Prisma.TaxGroupWhereInput>(query, scope);
      const [groups, total] = await Promise.all([
        tx.taxGroup.findMany({
          where,
          include: this.groupInclude(),
          orderBy: [{ code: 'asc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.taxGroup.count({ where }),
      ]);
      return this.paginated(groups.map((group) => this.groupResponse(group)), query, total);
    });
  }

  async detailGroup(id: string, query: TaxConfigurationQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.groupResponse(await this.findGroup(tx, scope.tenantId, id));
    });
  }

  async updateGroup(
    id: string,
    dto: UpdateTaxGroupDto,
    query: TaxConfigurationQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      const existing = await this.findGroup(tx, scope.tenantId, id);
      const effectiveFrom = dto.effectiveFrom
        ? this.parseDate(dto.effectiveFrom, 'effectiveFrom')
        : existing.effectiveFrom;
      const effectiveTo =
        dto.effectiveTo === undefined
          ? existing.effectiveTo
          : this.parseOptionalDate(dto.effectiveTo, 'effectiveTo');
      this.assertDateRange(effectiveFrom, effectiveTo);
      const rateIds = dto.rateIds ? this.uniqueIds(dto.rateIds, 'rateIds') : null;
      if (rateIds) {
        await this.assertRatesBelongToProfile(tx, scope.tenantId, existing.profileId, rateIds);
      }
      const updated = await tx.taxGroup.updateMany({
        where: { tenantId: scope.tenantId, id, version: dto.version },
        data: {
          name:
            dto.name === undefined ? existing.name : this.requiredText(dto.name, 'Tax group name'),
          description:
            dto.description === undefined
              ? existing.description
              : this.optionalText(dto.description),
          status: dto.status ?? existing.status,
          effectiveFrom,
          effectiveTo,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Tax group was updated by another request');
      }
      if (rateIds) {
        await tx.taxGroupRate.deleteMany({ where: { tenantId: scope.tenantId, groupId: id } });
        await tx.taxGroupRate.createMany({
          data: rateIds.map((rateId, index) => ({
            tenantId: scope.tenantId,
            groupId: id,
            rateId,
            sortOrder: index,
          })),
        });
      }
      const group = await this.findGroup(tx, scope.tenantId, id);
      await this.auditTax(tx, group, actor, request, 'tax.group.updated', 'TaxGroup');
      return this.groupResponse(group);
    });
  }

  async createRule(dto: CreateTaxRuleDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    const code = this.normalizedCode(dto.code);
    const effectiveFrom = this.parseDate(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo = this.parseOptionalDate(dto.effectiveTo, 'effectiveTo');
    this.assertDateRange(effectiveFrom, effectiveTo);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      await this.findActiveProfile(tx, scope.tenantId, dto.profileId);
      await this.assertGroupBelongsToProfile(tx, scope.tenantId, dto.profileId, dto.taxGroupId);
      await this.assertCodeAvailable(tx, 'rule', scope.tenantId, dto.profileId, code);
      const rule = await tx.taxRule.create({
        data: {
          tenantId: scope.tenantId,
          profileId: dto.profileId,
          taxGroupId: dto.taxGroupId,
          code,
          name: this.requiredText(dto.name, 'Tax rule name'),
          description: this.optionalText(dto.description),
          priority: dto.priority ?? 100,
          effectiveFrom,
          effectiveTo,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        include: this.ruleInclude(),
      });
      await this.auditTax(tx, rule, actor, request, 'tax.rule.created', 'TaxRule');
      return this.ruleResponse(rule);
    });
  }

  async listRules(query: TaxConfigurationQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.baseWhere<Prisma.TaxRuleWhereInput>(query, scope);
      const [rules, total] = await Promise.all([
        tx.taxRule.findMany({
          where,
          include: this.ruleInclude(),
          orderBy: [{ priority: 'asc' }, { code: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.taxRule.count({ where }),
      ]);
      return this.paginated(rules.map((rule) => this.ruleResponse(rule)), query, total);
    });
  }

  async detailRule(id: string, query: TaxConfigurationQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.ruleResponse(await this.findRule(tx, scope.tenantId, id));
    });
  }

  async updateRule(
    id: string,
    dto: UpdateTaxRuleDto,
    query: TaxConfigurationQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      const existing = await this.findRule(tx, scope.tenantId, id);
      if (dto.taxGroupId) {
        await this.assertGroupBelongsToProfile(tx, scope.tenantId, existing.profileId, dto.taxGroupId);
      }
      const effectiveFrom = dto.effectiveFrom
        ? this.parseDate(dto.effectiveFrom, 'effectiveFrom')
        : existing.effectiveFrom;
      const effectiveTo =
        dto.effectiveTo === undefined
          ? existing.effectiveTo
          : this.parseOptionalDate(dto.effectiveTo, 'effectiveTo');
      this.assertDateRange(effectiveFrom, effectiveTo);
      const updated = await tx.taxRule.updateMany({
        where: { tenantId: scope.tenantId, id, version: dto.version },
        data: {
          taxGroupId: dto.taxGroupId ?? existing.taxGroupId,
          name:
            dto.name === undefined ? existing.name : this.requiredText(dto.name, 'Tax rule name'),
          description:
            dto.description === undefined
              ? existing.description
              : this.optionalText(dto.description),
          priority: dto.priority ?? existing.priority,
          status: dto.status ?? existing.status,
          effectiveFrom,
          effectiveTo,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Tax rule was updated by another request');
      }
      const rule = await this.findRule(tx, scope.tenantId, id);
      await this.auditTax(tx, rule, actor, request, 'tax.rule.updated', 'TaxRule');
      return this.ruleResponse(rule);
    });
  }

  async createMapping(
    dto: CreateTaxCategoryMappingDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    const effectiveFrom = this.parseDate(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo = this.parseOptionalDate(dto.effectiveTo, 'effectiveTo');
    this.assertDateRange(effectiveFrom, effectiveTo);
    const targetIds = this.mappingTargetIds(dto.target, dto.menuCategoryId, dto.menuItemId);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      await this.findRule(tx, scope.tenantId, dto.taxRuleId);
      await this.assertMenuTarget(tx, scope.tenantId, dto.target, targetIds);
      await this.assertNoMappingOverlap(tx, scope.tenantId, dto.target, targetIds, effectiveFrom, effectiveTo);
      const mapping = await tx.taxCategoryMapping.create({
        data: {
          tenantId: scope.tenantId,
          taxRuleId: dto.taxRuleId,
          target: dto.target,
          menuCategoryId: targetIds.menuCategoryId,
          menuItemId: targetIds.menuItemId,
          effectiveFrom,
          effectiveTo,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
        include: this.mappingInclude(),
      });
      await this.auditTax(
        tx,
        mapping,
        actor,
        request,
        'tax.category_mapping.created',
        'TaxCategoryMapping',
      );
      return this.mappingResponse(mapping);
    });
  }

  async listMappings(query: TaxConfigurationQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.TaxCategoryMappingWhereInput = {
        tenantId: scope.tenantId,
        ...(query.profileId ? { taxRule: { profileId: query.profileId } } : {}),
      };
      const [mappings, total] = await Promise.all([
        tx.taxCategoryMapping.findMany({
          where,
          include: this.mappingInclude(),
          orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.taxCategoryMapping.count({ where }),
      ]);
      return this.paginated(mappings.map((mapping) => this.mappingResponse(mapping)), query, total);
    });
  }

  async detailMapping(id: string, query: TaxConfigurationQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.mappingResponse(await this.findMapping(tx, scope.tenantId, id));
    });
  }

  async updateMapping(
    id: string,
    dto: UpdateTaxCategoryMappingDto,
    query: TaxConfigurationQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      const existing = await this.findMapping(tx, scope.tenantId, id);
      if (dto.taxRuleId) {
        await this.findRule(tx, scope.tenantId, dto.taxRuleId);
      }
      const effectiveFrom = dto.effectiveFrom
        ? this.parseDate(dto.effectiveFrom, 'effectiveFrom')
        : existing.effectiveFrom;
      const effectiveTo =
        dto.effectiveTo === undefined
          ? existing.effectiveTo
          : this.parseOptionalDate(dto.effectiveTo, 'effectiveTo');
      this.assertDateRange(effectiveFrom, effectiveTo);
      const willBeActive = dto.isActive ?? existing.isActive;
      if (willBeActive) {
        await this.assertNoMappingOverlap(
          tx,
          scope.tenantId,
          existing.target,
          {
            menuCategoryId: existing.menuCategoryId,
            menuItemId: existing.menuItemId,
          },
          effectiveFrom,
          effectiveTo,
          id,
        );
      }
      const updated = await tx.taxCategoryMapping.updateMany({
        where: { tenantId: scope.tenantId, id, version: dto.version },
        data: {
          taxRuleId: dto.taxRuleId ?? existing.taxRuleId,
          effectiveFrom,
          effectiveTo,
          isActive: willBeActive,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Tax mapping was updated by another request');
      }
      const mapping = await this.findMapping(tx, scope.tenantId, id);
      await this.auditTax(
        tx,
        mapping,
        actor,
        request,
        'tax.category_mapping.updated',
        'TaxCategoryMapping',
      );
      return this.mappingResponse(mapping);
    });
  }

  private baseWhere<T extends Prisma.TaxRateWhereInput | Prisma.TaxGroupWhereInput | Prisma.TaxRuleWhereInput>(
    query: TaxConfigurationQueryDto,
    scope: TaxScope,
  ): T {
    const search = query.search?.trim();
    return {
      tenantId: scope.tenantId,
      ...(query.profileId ? { profileId: query.profileId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    } as T;
  }

  private groupInclude() {
    return {
      rates: {
        include: { rate: true },
        orderBy: { sortOrder: 'asc' as const },
      },
    } as const;
  }

  private ruleInclude() {
    return {
      taxGroup: {
        include: this.groupInclude(),
      },
    } as const;
  }

  private mappingInclude() {
    return {
      taxRule: {
        include: this.ruleInclude(),
      },
    } as const;
  }

  private async findActiveProfile(tx: Prisma.TransactionClient, tenantId: string, id: string) {
    const profile = await tx.taxProfile.findFirst({
      where: { tenantId, id, status: TaxProfileStatus.ACTIVE },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Active tax profile not found');
    }
  }

  private async findRate(tx: Prisma.TransactionClient, tenantId: string, id: string): Promise<TaxRate> {
    const rate = await tx.taxRate.findFirst({ where: { tenantId, id } });
    if (!rate) throw new NotFoundException('Tax rate not found');
    return rate;
  }

  private async findGroup(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<TaxGroupWithRates> {
    const group = await tx.taxGroup.findFirst({
      where: { tenantId, id },
      include: this.groupInclude(),
    });
    if (!group) throw new NotFoundException('Tax group not found');
    return group;
  }

  private async findRule(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<TaxRuleWithGroup> {
    const rule = await tx.taxRule.findFirst({
      where: { tenantId, id },
      include: this.ruleInclude(),
    });
    if (!rule) throw new NotFoundException('Tax rule not found');
    return rule;
  }

  private async findMapping(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<TaxMappingWithRule> {
    const mapping = await tx.taxCategoryMapping.findFirst({
      where: { tenantId, id },
      include: this.mappingInclude(),
    });
    if (!mapping) throw new NotFoundException('Tax category mapping not found');
    return mapping;
  }

  private async assertCodeAvailable(
    tx: Prisma.TransactionClient,
    kind: 'rate' | 'group' | 'rule',
    tenantId: string,
    profileId: string,
    code: string,
  ): Promise<void> {
    const existing =
      kind === 'rate'
        ? await tx.taxRate.findUnique({
            where: { tenantId_profileId_code: { tenantId, profileId, code } },
            select: { id: true },
          })
        : kind === 'group'
          ? await tx.taxGroup.findUnique({
              where: { tenantId_profileId_code: { tenantId, profileId, code } },
              select: { id: true },
            })
          : await tx.taxRule.findUnique({
              where: { tenantId_profileId_code: { tenantId, profileId, code } },
              select: { id: true },
            });
    if (existing) {
      throw new ConflictException(`Tax ${kind} code already exists`);
    }
  }

  private async assertRatesBelongToProfile(
    tx: Prisma.TransactionClient,
    tenantId: string,
    profileId: string,
    rateIds: string[],
  ): Promise<void> {
    const rates = await tx.taxRate.findMany({
      where: { tenantId, profileId, id: { in: rateIds }, status: TaxRateStatus.ACTIVE },
      select: { id: true },
    });
    if (rates.length !== rateIds.length) {
      throw new BadRequestException('All group rates must be active rates in the selected profile');
    }
  }

  private async assertGroupBelongsToProfile(
    tx: Prisma.TransactionClient,
    tenantId: string,
    profileId: string,
    groupId: string,
  ): Promise<void> {
    const group = await tx.taxGroup.findFirst({
      where: { tenantId, profileId, id: groupId, status: TaxGroupStatus.ACTIVE },
      select: { id: true },
    });
    if (!group) {
      throw new BadRequestException('Tax rule group must be an active group in the selected profile');
    }
  }

  private async assertMenuTarget(
    tx: Prisma.TransactionClient,
    tenantId: string,
    target: TaxMappingTarget,
    ids: { menuCategoryId: string | null; menuItemId: string | null },
  ): Promise<void> {
    if (target === TaxMappingTarget.TENANT_DEFAULT) {
      return;
    }
    if (target === TaxMappingTarget.CATEGORY) {
      const category = await tx.menuCategory.findFirst({
        where: { tenantId, id: ids.menuCategoryId!, deletedAt: null },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('Menu category not found');
      return;
    }
    const item = await tx.menuItem.findFirst({
      where: { tenantId, id: ids.menuItemId!, deletedAt: null },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Menu item not found');
  }

  private async assertNoMappingOverlap(
    tx: Prisma.TransactionClient,
    tenantId: string,
    target: TaxMappingTarget,
    ids: { menuCategoryId: string | null; menuItemId: string | null },
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeId?: string,
  ): Promise<void> {
    const where: Prisma.TaxCategoryMappingWhereInput = {
      tenantId,
      target,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...this.mappingOverlapTargetWhere(target, ids),
      effectiveFrom: effectiveTo ? { lt: effectiveTo } : undefined,
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
    };
    const conflict = await tx.taxCategoryMapping.findFirst({ where, select: { id: true } });
    if (conflict) {
      throw new ConflictException('Active tax mapping date range overlaps an existing mapping');
    }
  }

  private mappingTargetIds(
    target: TaxMappingTarget,
    menuCategoryId?: string | null,
    menuItemId?: string | null,
  ) {
    if (target === TaxMappingTarget.TENANT_DEFAULT) {
      if (menuCategoryId || menuItemId) {
        throw new BadRequestException('TENANT_DEFAULT tax mappings cannot include menu targets');
      }
      return { menuCategoryId: null, menuItemId: null };
    }
    if (target === TaxMappingTarget.CATEGORY) {
      if (!menuCategoryId || menuItemId) {
        throw new BadRequestException('CATEGORY tax mappings require menuCategoryId only');
      }
      return { menuCategoryId, menuItemId: null };
    }
    if (!menuItemId || menuCategoryId) {
      throw new BadRequestException('ITEM tax mappings require menuItemId only');
    }
    return { menuCategoryId: null, menuItemId };
  }

  private mappingOverlapTargetWhere(
    target: TaxMappingTarget,
    ids: { menuCategoryId: string | null; menuItemId: string | null },
  ): Prisma.TaxCategoryMappingWhereInput {
    if (target === TaxMappingTarget.TENANT_DEFAULT) {
      return { menuCategoryId: null, menuItemId: null };
    }
    if (target === TaxMappingTarget.CATEGORY) {
      return { menuCategoryId: ids.menuCategoryId };
    }
    return { menuItemId: ids.menuItemId };
  }

  private async lockTenant(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
  }

  private normalizedCode(value: string): string {
    return value.trim().toLowerCase();
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

  private parseDate(value: string, label: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} must be a valid ISO date`);
    }
    return parsed;
  }

  private parseOptionalDate(value: string | null | undefined, label: string): Date | null {
    if (value === undefined || value === null) return null;
    return this.parseDate(value, label);
  }

  private assertDateRange(effectiveFrom: Date, effectiveTo: Date | null): void {
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }
  }

  private uniqueIds(ids: string[], label: string): string[] {
    const unique = [...new Set(ids)];
    if (unique.length !== ids.length) {
      throw new BadRequestException(`${label} must not contain duplicate IDs`);
    }
    return unique;
  }

  private rateResponse(rate: TaxRate) {
    return {
      id: rate.id,
      tenantId: rate.tenantId,
      profileId: rate.profileId,
      code: rate.code,
      name: rate.name,
      description: rate.description,
      component: rate.component,
      taxType: rate.taxType,
      rateBps: rate.rateBps,
      status: rate.status,
      effectiveFrom: rate.effectiveFrom.toISOString(),
      effectiveTo: rate.effectiveTo?.toISOString() ?? null,
      version: rate.version,
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    };
  }

  private groupResponse(group: TaxGroupWithRates) {
    return {
      id: group.id,
      tenantId: group.tenantId,
      profileId: group.profileId,
      code: group.code,
      name: group.name,
      description: group.description,
      status: group.status,
      effectiveFrom: group.effectiveFrom.toISOString(),
      effectiveTo: group.effectiveTo?.toISOString() ?? null,
      rates: group.rates.map(({ rate, sortOrder }) => ({
        sortOrder,
        ...this.rateResponse(rate),
      })),
      version: group.version,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }

  private ruleResponse(rule: TaxRuleWithGroup) {
    return {
      id: rule.id,
      tenantId: rule.tenantId,
      profileId: rule.profileId,
      taxGroupId: rule.taxGroupId,
      code: rule.code,
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      status: rule.status,
      effectiveFrom: rule.effectiveFrom.toISOString(),
      effectiveTo: rule.effectiveTo?.toISOString() ?? null,
      taxGroup: this.groupResponse(rule.taxGroup),
      version: rule.version,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private mappingResponse(mapping: TaxMappingWithRule) {
    return {
      id: mapping.id,
      tenantId: mapping.tenantId,
      taxRuleId: mapping.taxRuleId,
      target: mapping.target,
      menuCategoryId: mapping.menuCategoryId,
      menuItemId: mapping.menuItemId,
      effectiveFrom: mapping.effectiveFrom.toISOString(),
      effectiveTo: mapping.effectiveTo?.toISOString() ?? null,
      isActive: mapping.isActive,
      taxRule: this.ruleResponse(mapping.taxRule),
      version: mapping.version,
      createdAt: mapping.createdAt.toISOString(),
      updatedAt: mapping.updatedAt.toISOString(),
    };
  }

  private paginated<T>(data: T[], query: TaxConfigurationQueryDto, total: number) {
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private async auditTax(
    tx: Prisma.TransactionClient,
    record: { id: string; tenantId: string; code?: string; status?: string },
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    targetType: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: record.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType,
      targetId: record.id,
      result: AuditResult.SUCCESS,
      metadata: {
        code: record.code,
        status: record.status,
      },
      ...request,
    });
  }
}
