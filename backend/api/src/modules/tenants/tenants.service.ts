import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import {
  applyDatabaseRequestContext,
  hasRole,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../common/database/request-context.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type {
  TenantListResponseDto,
  TenantResponseDto,
} from './dto/tenant-response.dto';
import type { TenantQueryDto } from './dto/tenant-query.dto';
import type { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';

const tenantSelect = {
  id: true,
  slug: true,
  name: true,
  legalName: true,
  email: true,
  phone: true,
  status: true,
  locale: true,
  timezone: true,
  currencyCode: true,
  outletLimit: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantSelect;

type TenantRecord = Prisma.TenantGetPayload<{ select: typeof tenantSelect }>;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateTenantDto,
    user: AuthenticatedUser,
  ): Promise<TenantResponseDto> {
    requireRole(user, [PLATFORM_ADMIN_ROLE]);

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user);

      try {
        const tenant = await transaction.tenant.create({
          data: {
            slug: dto.slug ?? this.generateSlug(dto.name),
            name: dto.name.trim(),
            legalName: dto.legalName?.trim(),
            email: dto.email,
            phone: dto.phone,
            outletLimit: dto.outletLimit,
            locale: dto.locale,
            timezone: dto.timezone,
            currencyCode: dto.currencyCode,
          },
          select: tenantSelect,
        });

        return this.toResponse(tenant);
      } catch (error: unknown) {
        this.throwSafePersistenceError(error, 'Tenant slug already exists');
      }
    });
  }

  async findAll(
    query: TenantQueryDto,
    user: AuthenticatedUser,
  ): Promise<TenantListResponseDto> {
    requireRole(user, [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE]);
    const isPlatformAdmin = hasRole(user, PLATFORM_ADMIN_ROLE);
    const tenantId = isPlatformAdmin ? undefined : requireTenantId(user);

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const where: Prisma.TenantWhereInput = {
        deletedAt: null,
        ...(tenantId === undefined ? {} : { id: tenantId }),
        ...(query.status === undefined ? {} : { status: query.status }),
        ...(query.search === undefined || query.search.trim() === ''
          ? {}
          : {
              OR: [
                {
                  name: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  legalName: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  slug: {
                    contains: query.search.trim().toLowerCase(),
                  },
                },
              ],
            }),
      };
      const skip = (query.page - 1) * query.limit;
      const [data, total] = await Promise.all([
        transaction.tenant.findMany({
          where,
          select: tenantSelect,
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
        transaction.tenant.count({ where }),
      ]);

      return {
        data: data.map((tenant) => this.toResponse(tenant)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<TenantResponseDto> {
    requireRole(user, [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE]);
    this.assertTenantAccess(id, user);

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, id);
      const tenant = await transaction.tenant.findFirst({
        where: { id, deletedAt: null },
        select: tenantSelect,
      });

      if (tenant === null) {
        throw new NotFoundException('Tenant not found');
      }

      return this.toResponse(tenant);
    });
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    user: AuthenticatedUser,
  ): Promise<TenantResponseDto> {
    requireRole(user, [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE]);
    this.assertTenantAccess(id, user);
    const isPlatformAdmin = hasRole(user, PLATFORM_ADMIN_ROLE);

    if (!isPlatformAdmin && (dto.outletLimit !== undefined || dto.slug !== undefined)) {
      throw new ForbiddenException(
        'Tenant administrators cannot update slug or outlet limit',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, id);
      const existing = await transaction.tenant.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (existing === null) {
        throw new NotFoundException('Tenant not found');
      }

      try {
        const tenant = await transaction.tenant.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            slug: isPlatformAdmin ? dto.slug : undefined,
            legalName: dto.legalName?.trim(),
            email: dto.email,
            phone: dto.phone,
            outletLimit: isPlatformAdmin ? dto.outletLimit : undefined,
            locale: dto.locale,
            timezone: dto.timezone,
            currencyCode: dto.currencyCode,
            version: { increment: 1 },
          },
          select: tenantSelect,
        });

        return this.toResponse(tenant);
      } catch (error: unknown) {
        this.throwSafePersistenceError(error, 'Tenant slug already exists');
      }
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateTenantStatusDto,
    user: AuthenticatedUser,
  ): Promise<TenantResponseDto> {
    requireRole(user, [PLATFORM_ADMIN_ROLE]);

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, id);
      const existing = await transaction.tenant.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (existing === null) {
        throw new NotFoundException('Tenant not found');
      }

      const tenant = await transaction.tenant.update({
        where: { id },
        data: {
          status: dto.status,
          deletedAt: dto.status === TenantStatus.CLOSED ? new Date() : null,
          version: { increment: 1 },
        },
        select: tenantSelect,
      });

      return this.toResponse(tenant);
    });
  }

  private assertTenantAccess(id: string, user: AuthenticatedUser): void {
    if (!hasRole(user, PLATFORM_ADMIN_ROLE) && requireTenantId(user) !== id) {
      throw new ForbiddenException('Cross-tenant access is forbidden');
    }
  }

  private generateSlug(name: string): string {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 54);
    const fallback = base === '' ? 'tenant' : base;
    return `${fallback}-${randomUUID().slice(0, 8)}`;
  }

  private toResponse(tenant: TenantRecord): TenantResponseDto {
    return tenant;
  }

  private throwSafePersistenceError(error: unknown, conflictMessage: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(conflictMessage);
    }

    throw error;
  }
}
