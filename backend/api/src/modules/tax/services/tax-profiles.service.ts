import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditResult,
  Prisma,
  TaxMode,
  TaxProfileStatus,
  TaxType,
  type TaxProfile,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AuditRequestMetadata } from '../../audit/models/audit-event.model';
import { AuditService } from '../../audit/services/audit.service';
import type {
  CreateTaxProfileDto,
  TaxProfileQueryDto,
  UpdateTaxProfileDto,
} from '../dto/tax-profile.dto';
import {
  requireTaxProfileManage,
  requireTaxProfileRead,
  resolveTaxScope,
  type TaxScope,
} from './tax-access.util';

@Injectable()
export class TaxProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTaxProfileDto, actor: AuthenticatedUser, request: AuditRequestMetadata) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, dto.tenantId);
    const code = dto.code.trim().toLowerCase();
    this.assertTaxClassification(dto.taxType, dto.taxMode);

    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      const existing = await tx.taxProfile.findUnique({
        where: { tenantId_code: { tenantId: scope.tenantId, code } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Tax profile code already exists');
      }
      if (dto.isDefault === true) {
        await this.clearDefault(tx, scope.tenantId, actor.id);
      }
      const profile = await tx.taxProfile.create({
        data: {
          tenantId: scope.tenantId,
          code,
          name: this.requiredText(dto.name, 'Tax profile name'),
          description: this.optionalText(dto.description),
          taxType: dto.taxType,
          taxMode: dto.taxMode,
          countryCode: dto.countryCode ?? 'IN',
          currencyCode: dto.currencyCode ?? 'INR',
          isDefault: dto.isDefault ?? false,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
      });
      await this.auditProfile(tx, profile, actor, request, 'tax.profile.created');
      return this.profileResponse(profile);
    });
  }

  async list(query: TaxProfileQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where = this.profileWhere(query, scope);
      const [profiles, total] = await Promise.all([
        tx.taxProfile.findMany({
          where,
          orderBy: [{ isDefault: 'desc' }, { code: 'asc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.taxProfile.count({ where }),
      ]);
      return {
        data: profiles.map((profile) => this.profileResponse(profile)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async detail(id: string, query: TaxProfileQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      return this.profileResponse(await this.findProfile(tx, scope.tenantId, id));
    });
  }

  async defaultProfile(query: TaxProfileQueryDto, actor: AuthenticatedUser) {
    requireTaxProfileRead(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const profile = await tx.taxProfile.findFirst({
        where: {
          tenantId: scope.tenantId,
          isDefault: true,
          status: TaxProfileStatus.ACTIVE,
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (!profile) {
        throw new NotFoundException('Default active tax profile not found');
      }
      return this.profileResponse(profile);
    });
  }

  async update(
    id: string,
    dto: UpdateTaxProfileDto,
    query: TaxProfileQueryDto,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
  ) {
    requireTaxProfileManage(actor);
    const scope = resolveTaxScope(actor, query.tenantId);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      await this.lockTenant(tx, scope.tenantId);
      const existing = await this.findProfile(tx, scope.tenantId, id);
      const next = this.nextValues(existing, dto);
      this.assertTaxClassification(next.taxType, next.taxMode);
      if (next.isDefault && next.status !== TaxProfileStatus.ACTIVE) {
        throw new BadRequestException('Only active tax profiles can be default');
      }
      if (next.isDefault) {
        await tx.taxProfile.updateMany({
          where: {
            tenantId: scope.tenantId,
            id: { not: id },
            isDefault: true,
          },
          data: {
            isDefault: false,
            updatedByUserId: actor.id,
            version: { increment: 1 },
          },
        });
      }
      const updated = await tx.taxProfile.updateMany({
        where: { tenantId: scope.tenantId, id, version: dto.version },
        data: {
          name: next.name,
          description: next.description,
          taxType: next.taxType,
          taxMode: next.taxMode,
          countryCode: next.countryCode,
          currencyCode: next.currencyCode,
          isDefault: next.isDefault,
          status: next.status,
          updatedByUserId: actor.id,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Tax profile was updated by another request');
      }
      const profile = await this.findProfile(tx, scope.tenantId, id);
      await this.auditProfile(tx, profile, actor, request, 'tax.profile.updated');
      return this.profileResponse(profile);
    });
  }

  private profileWhere(query: TaxProfileQueryDto, scope: TaxScope): Prisma.TaxProfileWhereInput {
    const search = query.search?.trim();
    return {
      tenantId: scope.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.taxType ? { taxType: query.taxType } : {}),
      ...(query.taxMode ? { taxMode: query.taxMode } : {}),
      ...(query.isDefault !== undefined ? { isDefault: query.isDefault } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async findProfile(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<TaxProfile> {
    const profile = await tx.taxProfile.findFirst({ where: { tenantId, id } });
    if (!profile) {
      throw new NotFoundException('Tax profile not found');
    }
    return profile;
  }

  private async clearDefault(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
  ): Promise<void> {
    await tx.taxProfile.updateMany({
      where: { tenantId, isDefault: true },
      data: {
        isDefault: false,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
  }

  private async lockTenant(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
  }

  private nextValues(existing: TaxProfile, dto: UpdateTaxProfileDto) {
    return {
      name:
        dto.name === undefined ? existing.name : this.requiredText(dto.name, 'Tax profile name'),
      description:
        dto.description === undefined ? existing.description : this.optionalText(dto.description),
      taxType: dto.taxType ?? existing.taxType,
      taxMode: dto.taxMode ?? existing.taxMode,
      countryCode: dto.countryCode ?? existing.countryCode,
      currencyCode: dto.currencyCode ?? existing.currencyCode,
      isDefault: dto.isDefault ?? existing.isDefault,
      status: dto.status ?? existing.status,
    };
  }

  private assertTaxClassification(taxType: TaxType, taxMode: TaxMode): void {
    if (taxType === TaxType.EXEMPT && taxMode !== TaxMode.EXEMPT) {
      throw new BadRequestException('EXEMPT tax profiles must use EXEMPT mode');
    }
    if (taxType === TaxType.ZERO_RATED && taxMode !== TaxMode.ZERO_RATED) {
      throw new BadRequestException('ZERO_RATED tax profiles must use ZERO_RATED mode');
    }
    if (
      taxType !== TaxType.EXEMPT &&
      taxType !== TaxType.ZERO_RATED &&
      (taxMode === TaxMode.EXEMPT || taxMode === TaxMode.ZERO_RATED)
    ) {
      throw new BadRequestException('Taxable profiles must use INCLUSIVE or EXCLUSIVE mode');
    }
  }

  private async auditProfile(
    tx: Prisma.TransactionClient,
    profile: TaxProfile,
    actor: AuthenticatedUser,
    request: AuditRequestMetadata,
    action: string,
  ): Promise<void> {
    await this.audit.append(tx, {
      tenantId: profile.tenantId,
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      targetType: 'TaxProfile',
      targetId: profile.id,
      result: AuditResult.SUCCESS,
      metadata: {
        code: profile.code,
        status: profile.status,
        taxType: profile.taxType,
        taxMode: profile.taxMode,
        isDefault: profile.isDefault,
      },
      ...request,
    });
  }

  private profileResponse(profile: TaxProfile) {
    return {
      id: profile.id,
      tenantId: profile.tenantId,
      code: profile.code,
      name: profile.name,
      description: profile.description,
      taxType: profile.taxType,
      taxMode: profile.taxMode,
      countryCode: profile.countryCode,
      currencyCode: profile.currencyCode,
      isDefault: profile.isDefault,
      status: profile.status,
      version: profile.version,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
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
