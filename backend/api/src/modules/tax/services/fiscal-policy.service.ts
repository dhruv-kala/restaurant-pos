import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  FiscalInvoiceSequenceStatus,
  FiscalPolicyStatus,
  OutletStatus,
  Prisma,
  TaxProfileStatus,
  type FiscalInvoiceSequence,
  type OutletFiscalPolicy,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CreateFiscalInvoiceSequenceDto,
  CreateOutletFiscalPolicyDto,
  FiscalPolicyQueryDto,
  FiscalSequenceQueryDto,
  GenerateFiscalInvoiceNumberDto,
  UpdateFiscalInvoiceSequenceDto,
  UpdateOutletFiscalPolicyDto,
} from '../dto/fiscal-policy.dto';
import {
  requireFiscalPolicyManage,
  requireFiscalPolicyRead,
  resolveTaxScope,
} from './tax-access.util';

@Injectable()
export class FiscalPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPolicy(
    dto: CreateOutletFiscalPolicyDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireFiscalPolicyManage(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    const effectiveFrom = this.parseInstant(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo = this.parseOptionalInstant(dto.effectiveTo, 'effectiveTo');
    this.assertInstantRange(effectiveFrom, effectiveTo);
    this.assertFiscalStart(dto.fiscalYearStartMonth ?? 4, dto.fiscalYearStartDay ?? 1);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockOutlet(tx, scope.tenantId, dto.outletId);
      const outlet = await this.findOutlet(tx, scope.tenantId, dto.outletId);
      if (dto.taxProfileId) {
        await this.findActiveTaxProfile(tx, scope.tenantId, dto.taxProfileId);
      }
      await this.assertNoPolicyOverlap(
        tx,
        scope.tenantId,
        dto.outletId,
        effectiveFrom,
        effectiveTo,
      );
      const policy = await tx.outletFiscalPolicy.create({
        data: {
          tenantId: scope.tenantId,
          outletId: dto.outletId,
          taxProfileId: dto.taxProfileId ?? null,
          invoicePrefix: this.normalizedPrefix(dto.invoicePrefix),
          invoicePadding: dto.invoicePadding ?? 5,
          fiscalYearStartMonth: dto.fiscalYearStartMonth ?? 4,
          fiscalYearStartDay: dto.fiscalYearStartDay ?? 1,
          timezone: this.requiredText(dto.timezone || outlet.timezone, 'Timezone'),
          effectiveFrom,
          effectiveTo,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
      });
      await this.auditFiscal(
        tx,
        policy,
        actor,
        request,
        'tax.fiscal_policy.created',
        'OutletFiscalPolicy',
        { outletId: policy.outletId, invoicePrefix: policy.invoicePrefix },
      );
      return this.policyResponse(policy);
    });
  }

  async listPolicies(query: FiscalPolicyQueryDto, actor: AuthenticatedUser) {
    requireFiscalPolicyRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.OutletFiscalPolicyWhereInput = {
        tenantId: scope.tenantId,
        ...(query.outletId ? { outletId: query.outletId } : {}),
        ...(query.status ? { status: query.status } : {}),
      };
      const [policies, total] = await Promise.all([
        tx.outletFiscalPolicy.findMany({
          where,
          orderBy: [{ outletId: 'asc' }, { effectiveFrom: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.outletFiscalPolicy.count({ where }),
      ]);
      return this.paginated(policies.map((policy) => this.policyResponse(policy)), query, total);
    });
  }

  async detailPolicy(id: string, query: FiscalPolicyQueryDto, actor: AuthenticatedUser) {
    requireFiscalPolicyRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.policyResponse(await this.findPolicy(tx, scope.tenantId, id));
    });
  }

  async updatePolicy(
    id: string,
    dto: UpdateOutletFiscalPolicyDto,
    query: FiscalPolicyQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireFiscalPolicyManage(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findPolicy(tx, scope.tenantId, id);
      await this.lockOutlet(tx, scope.tenantId, existing.outletId);
      if (dto.taxProfileId) {
        await this.findActiveTaxProfile(tx, scope.tenantId, dto.taxProfileId);
      }
      const effectiveFrom = dto.effectiveFrom
        ? this.parseInstant(dto.effectiveFrom, 'effectiveFrom')
        : existing.effectiveFrom;
      const effectiveTo =
        dto.effectiveTo === undefined
          ? existing.effectiveTo
          : this.parseOptionalInstant(dto.effectiveTo, 'effectiveTo');
      this.assertInstantRange(effectiveFrom, effectiveTo);
      this.assertFiscalStart(
        dto.fiscalYearStartMonth ?? existing.fiscalYearStartMonth,
        dto.fiscalYearStartDay ?? existing.fiscalYearStartDay,
      );
      if ((dto.status ?? existing.status) === FiscalPolicyStatus.ACTIVE) {
        await this.assertNoPolicyOverlap(
          tx,
          scope.tenantId,
          existing.outletId,
          effectiveFrom,
          effectiveTo,
          id,
        );
      }
      const updated = await tx.outletFiscalPolicy.updateMany({
        where: { tenantId: scope.tenantId, id, version: dto.version },
        data: {
          taxProfileId: dto.taxProfileId === undefined ? existing.taxProfileId : dto.taxProfileId,
          invoicePrefix:
            dto.invoicePrefix === undefined
              ? existing.invoicePrefix
              : this.normalizedPrefix(dto.invoicePrefix),
          invoicePadding: dto.invoicePadding ?? existing.invoicePadding,
          fiscalYearStartMonth: dto.fiscalYearStartMonth ?? existing.fiscalYearStartMonth,
          fiscalYearStartDay: dto.fiscalYearStartDay ?? existing.fiscalYearStartDay,
          timezone:
            dto.timezone === undefined
              ? existing.timezone
              : this.requiredText(dto.timezone, 'Timezone'),
          status: dto.status ?? existing.status,
          effectiveFrom,
          effectiveTo,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Fiscal policy was updated by another request');
      }
      const policy = await this.findPolicy(tx, scope.tenantId, id);
      await this.auditFiscal(
        tx,
        policy,
        actor,
        request,
        'tax.fiscal_policy.updated',
        'OutletFiscalPolicy',
        { outletId: policy.outletId, status: policy.status },
      );
      return this.policyResponse(policy);
    });
  }

  async createSequence(
    dto: CreateFiscalInvoiceSequenceDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireFiscalPolicyManage(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    const startsAt = this.parseDate(dto.startsAt, 'startsAt');
    const endsAt = this.parseDate(dto.endsAt, 'endsAt');
    this.assertDateRange(startsAt, endsAt);
    const startNumber = dto.startNumber ?? 1;
    if (startNumber < 1) {
      throw new BadRequestException('startNumber must be at least 1');
    }

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockOutlet(tx, scope.tenantId, dto.outletId);
      await this.findOutlet(tx, scope.tenantId, dto.outletId);
      const policy = await this.findPolicy(tx, scope.tenantId, dto.fiscalPolicyId);
      if (policy.outletId !== dto.outletId || policy.status !== FiscalPolicyStatus.ACTIVE) {
        throw new BadRequestException('Fiscal sequence must reference an active policy for the outlet');
      }
      const sequence = await tx.fiscalInvoiceSequence.create({
        data: {
          tenantId: scope.tenantId,
          outletId: dto.outletId,
          fiscalPolicyId: dto.fiscalPolicyId,
          fiscalYearLabel: dto.fiscalYearLabel.trim(),
          prefix: this.normalizedPrefix(dto.prefix),
          padding: dto.padding ?? policy.invoicePadding,
          lastNumber: startNumber - 1,
          startsAt,
          endsAt,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
      });
      await this.auditFiscal(
        tx,
        sequence,
        actor,
        request,
        'tax.fiscal_sequence.created',
        'FiscalInvoiceSequence',
        {
          outletId: sequence.outletId,
          fiscalYearLabel: sequence.fiscalYearLabel,
          prefix: sequence.prefix,
        },
      );
      return this.sequenceResponse(sequence);
    });
  }

  async listSequences(query: FiscalSequenceQueryDto, actor: AuthenticatedUser) {
    requireFiscalPolicyRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.FiscalInvoiceSequenceWhereInput = {
        tenantId: scope.tenantId,
        ...(query.outletId ? { outletId: query.outletId } : {}),
        ...(query.fiscalPolicyId ? { fiscalPolicyId: query.fiscalPolicyId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.fiscalYearLabel ? { fiscalYearLabel: query.fiscalYearLabel.trim() } : {}),
      };
      const [sequences, total] = await Promise.all([
        tx.fiscalInvoiceSequence.findMany({
          where,
          orderBy: [{ startsAt: 'desc' }, { prefix: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.fiscalInvoiceSequence.count({ where }),
      ]);
      return this.paginated(
        sequences.map((sequence) => this.sequenceResponse(sequence)),
        query,
        total,
      );
    });
  }

  async detailSequence(id: string, query: FiscalSequenceQueryDto, actor: AuthenticatedUser) {
    requireFiscalPolicyRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.sequenceResponse(await this.findSequence(tx, scope.tenantId, id));
    });
  }

  async updateSequence(
    id: string,
    dto: UpdateFiscalInvoiceSequenceDto,
    query: FiscalSequenceQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireFiscalPolicyManage(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findSequence(tx, scope.tenantId, id);
      await this.lockOutlet(tx, scope.tenantId, existing.outletId);
      const updated = await tx.fiscalInvoiceSequence.updateMany({
        where: { tenantId: scope.tenantId, id, version: dto.version },
        data: {
          status: dto.status ?? existing.status,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Fiscal invoice sequence was updated by another request');
      }
      const sequence = await this.findSequence(tx, scope.tenantId, id);
      await this.auditFiscal(
        tx,
        sequence,
        actor,
        request,
        'tax.fiscal_sequence.updated',
        'FiscalInvoiceSequence',
        { outletId: sequence.outletId, status: sequence.status },
      );
      return this.sequenceResponse(sequence);
    });
  }

  async generateInvoiceNumber(
    id: string,
    dto: GenerateFiscalInvoiceNumberDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireFiscalPolicyManage(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const existing = await this.findSequence(tx, scope.tenantId, id);
      await this.lockOutlet(tx, scope.tenantId, existing.outletId);
      if (existing.status !== FiscalInvoiceSequenceStatus.ACTIVE) {
        throw new BadRequestException('Fiscal invoice sequence is not active');
      }
      const sequence = await tx.fiscalInvoiceSequence.update({
        where: { id },
        data: {
          lastNumber: { increment: 1 },
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      const invoiceNumber = this.formatInvoiceNumber(
        sequence.prefix,
        sequence.fiscalYearLabel,
        sequence.lastNumber,
        sequence.padding,
      );
      await this.auditFiscal(
        tx,
        sequence,
        actor,
        request,
        'tax.fiscal_sequence.invoice_number_generated',
        'FiscalInvoiceSequence',
        {
          outletId: sequence.outletId,
          fiscalYearLabel: sequence.fiscalYearLabel,
          invoiceNumber,
          lastNumber: sequence.lastNumber,
        },
      );
      return {
        sequence: this.sequenceResponse(sequence),
        invoiceNumber,
      };
    });
  }

  private async findOutlet(tx: Prisma.TransactionClient, tenantId: string, outletId: string) {
    const outlet = await tx.outlet.findFirst({
      where: { tenantId, id: outletId, deletedAt: null, status: { not: OutletStatus.CLOSED } },
      select: { id: true, timezone: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    return outlet;
  }

  private async findActiveTaxProfile(
    tx: Prisma.TransactionClient,
    tenantId: string,
    taxProfileId: string,
  ): Promise<void> {
    const profile = await tx.taxProfile.findFirst({
      where: { tenantId, id: taxProfileId, status: TaxProfileStatus.ACTIVE },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Active tax profile not found');
  }

  private async findPolicy(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<OutletFiscalPolicy> {
    const policy = await tx.outletFiscalPolicy.findFirst({ where: { tenantId, id } });
    if (!policy) throw new NotFoundException('Outlet fiscal policy not found');
    return policy;
  }

  private async findSequence(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<FiscalInvoiceSequence> {
    const sequence = await tx.fiscalInvoiceSequence.findFirst({ where: { tenantId, id } });
    if (!sequence) throw new NotFoundException('Fiscal invoice sequence not found');
    return sequence;
  }

  private async assertNoPolicyOverlap(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await tx.outletFiscalPolicy.findFirst({
      where: {
        tenantId,
        outletId,
        status: FiscalPolicyStatus.ACTIVE,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        effectiveFrom: effectiveTo ? { lt: effectiveTo } : undefined,
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Active fiscal policy date range overlaps an existing policy');
    }
  }

  private async lockOutlet(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${outletId}`}))`;
  }

  private parseInstant(value: string, label: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} must be a valid ISO date`);
    }
    return parsed;
  }

  private parseOptionalInstant(value: string | null | undefined, label: string): Date | null {
    if (value === undefined || value === null) return null;
    return this.parseInstant(value, label);
  }

  private parseDate(value: string, label: string): Date {
    const parsed = this.parseInstant(value, label);
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  private assertInstantRange(from: Date, to: Date | null): void {
    if (to && to <= from) throw new BadRequestException('effectiveTo must be after effectiveFrom');
  }

  private assertDateRange(startsAt: Date, endsAt: Date): void {
    if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt');
  }

  private assertFiscalStart(month: number, day: number): void {
    const test = new Date(Date.UTC(2024, month - 1, day));
    if (test.getUTCMonth() !== month - 1 || test.getUTCDate() !== day) {
      throw new BadRequestException('Fiscal year start day is invalid for the selected month');
    }
  }

  private normalizedPrefix(value: string): string {
    return this.requiredText(value, 'Invoice prefix').toUpperCase();
  }

  private requiredText(value: string, label: string): string {
    const trimmed = value.trim();
    if (!trimmed) throw new BadRequestException(`${label} is required`);
    return trimmed;
  }

  private formatInvoiceNumber(prefix: string, fiscalYearLabel: string, number: number, padding: number) {
    return `${prefix}-${fiscalYearLabel}-${number.toString().padStart(padding, '0')}`;
  }

  private policyResponse(policy: OutletFiscalPolicy) {
    return {
      id: policy.id,
      tenantId: policy.tenantId,
      outletId: policy.outletId,
      taxProfileId: policy.taxProfileId,
      invoicePrefix: policy.invoicePrefix,
      invoicePadding: policy.invoicePadding,
      fiscalYearStartMonth: policy.fiscalYearStartMonth,
      fiscalYearStartDay: policy.fiscalYearStartDay,
      timezone: policy.timezone,
      status: policy.status,
      effectiveFrom: policy.effectiveFrom.toISOString(),
      effectiveTo: policy.effectiveTo?.toISOString() ?? null,
      version: policy.version,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  private sequenceResponse(sequence: FiscalInvoiceSequence) {
    return {
      id: sequence.id,
      tenantId: sequence.tenantId,
      outletId: sequence.outletId,
      fiscalPolicyId: sequence.fiscalPolicyId,
      fiscalYearLabel: sequence.fiscalYearLabel,
      prefix: sequence.prefix,
      padding: sequence.padding,
      lastNumber: sequence.lastNumber,
      status: sequence.status,
      startsAt: sequence.startsAt.toISOString().slice(0, 10),
      endsAt: sequence.endsAt.toISOString().slice(0, 10),
      version: sequence.version,
      createdAt: sequence.createdAt.toISOString(),
      updatedAt: sequence.updatedAt.toISOString(),
    };
  }

  private paginated<T>(
    data: T[],
    query: { page: number; limit: number },
    total: number,
  ) {
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

  private async auditFiscal(
    tx: Prisma.TransactionClient,
    record: { id: string; tenantId: string; outletId: string; status?: string },
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
    targetType: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: record.tenantId,
      outletId: record.outletId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType,
      targetId: record.id,
      result: AuditResult.SUCCESS,
      metadata: {
        status: record.status,
        ...metadata,
      },
      ...request,
    });
  }
}
