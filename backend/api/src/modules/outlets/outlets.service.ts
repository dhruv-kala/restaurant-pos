import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OutletStatus, Prisma, TenantStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import {
  applyDatabaseRequestContext,
  hasRole,
  MANAGER_ROLE,
  PLATFORM_ADMIN_ROLE,
  requireRole,
  requireTenantId,
  TENANT_ADMIN_ROLE,
} from '../../common/database/request-context.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import type { CreateOutletDto } from './dto/create-outlet.dto';
import type {
  OutletListResponseDto,
  OutletResponseDto,
} from './dto/outlet-response.dto';
import type { OutletQueryDto } from './dto/outlet-query.dto';
import type { UpdateOutletStatusDto } from './dto/update-outlet-status.dto';
import type { UpdateOutletDto } from './dto/update-outlet.dto';

const outletSelect = {
  id: true,
  tenantId: true,
  name: true,
  code: true,
  email: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  timezone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OutletSelect;

type OutletRecord = Prisma.OutletGetPayload<{ select: typeof outletSelect }>;

@Injectable()
export class OutletsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateOutletDto,
    user: AuthenticatedUser,
  ): Promise<OutletResponseDto> {
    requireRole(user, [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE]);
    const tenantId = this.resolveWriteTenantId(dto.tenantId, user);
    if (dto.status === OutletStatus.CLOSED) {
      throw new BadRequestException(
        'Outlets cannot be created with CLOSED status',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const tenant = await transaction.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: {
          id: true,
          status: true,
          outletLimit: true,
          timezone: true,
        },
      });

      if (tenant === null) {
        throw new NotFoundException('Tenant not found');
      }
      if (
        tenant.status !== TenantStatus.ACTIVE &&
        tenant.status !== TenantStatus.TRIAL
      ) {
        throw new BadRequestException(
          'Outlets cannot be created for the current tenant status',
        );
      }

      const currentOutletCount = await transaction.outlet.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: OutletStatus.CLOSED },
        },
      });
      if (currentOutletCount >= tenant.outletLimit) {
        throw new BadRequestException(
          'Outlet limit reached for current subscription plan',
        );
      }

      try {
        const outlet = await transaction.outlet.create({
          data: {
            tenantId,
            name: dto.name.trim(),
            code: dto.code?.toUpperCase() ?? this.generateCode(dto.name),
            email: dto.email,
            phone: dto.phone,
            addressLine1: dto.addressLine1?.trim(),
            addressLine2: dto.addressLine2?.trim(),
            city: dto.city?.trim(),
            state: dto.state?.trim(),
            country: dto.country,
            postalCode: dto.postalCode?.trim(),
            timezone: dto.timezone ?? tenant.timezone,
            status: dto.status,
          },
          select: outletSelect,
        });

        return this.toResponse(outlet);
      } catch (error: unknown) {
        this.throwSafePersistenceError(error);
      }
    });
  }

  async findAll(
    query: OutletQueryDto,
    user: AuthenticatedUser,
    forcedTenantId?: string,
  ): Promise<OutletListResponseDto> {
    requireRole(user, [
      PLATFORM_ADMIN_ROLE,
      TENANT_ADMIN_ROLE,
      MANAGER_ROLE,
    ]);
    const tenantId = this.resolveReadTenantId(
      forcedTenantId ?? query.tenantId,
      user,
    );

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const where: Prisma.OutletWhereInput = {
        deletedAt: null,
        ...(tenantId === undefined ? {} : { tenantId }),
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
                  code: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  city: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }),
      };
      const skip = (query.page - 1) * query.limit;
      const [data, total] = await Promise.all([
        transaction.outlet.findMany({
          where,
          select: outletSelect,
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
        transaction.outlet.count({ where }),
      ]);

      return {
        data: data.map((outlet) => this.toResponse(outlet)),
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
  ): Promise<OutletResponseDto> {
    requireRole(user, [
      PLATFORM_ADMIN_ROLE,
      TENANT_ADMIN_ROLE,
      MANAGER_ROLE,
    ]);
    const tenantId = hasRole(user, PLATFORM_ADMIN_ROLE)
      ? undefined
      : requireTenantId(user);

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, tenantId);
      const outlet = await transaction.outlet.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(tenantId === undefined ? {} : { tenantId }),
        },
        select: outletSelect,
      });

      if (outlet === null) {
        throw new NotFoundException('Outlet not found');
      }

      return this.toResponse(outlet);
    });
  }

  async update(
    id: string,
    dto: UpdateOutletDto,
    user: AuthenticatedUser,
  ): Promise<OutletResponseDto> {
    requireRole(user, [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE]);

    return this.updateWithTenantScope(id, user, async (transaction, outlet) => {
      try {
        const updated = await transaction.outlet.update({
          where: { id: outlet.id },
          data: {
            name: dto.name?.trim(),
            code: dto.code?.toUpperCase(),
            email: dto.email,
            phone: dto.phone,
            addressLine1: dto.addressLine1?.trim(),
            addressLine2: dto.addressLine2?.trim(),
            city: dto.city?.trim(),
            state: dto.state?.trim(),
            country: dto.country,
            postalCode: dto.postalCode?.trim(),
            timezone: dto.timezone,
            version: { increment: 1 },
          },
          select: outletSelect,
        });
        return this.toResponse(updated);
      } catch (error: unknown) {
        this.throwSafePersistenceError(error);
      }
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateOutletStatusDto,
    user: AuthenticatedUser,
  ): Promise<OutletResponseDto> {
    requireRole(user, [PLATFORM_ADMIN_ROLE, TENANT_ADMIN_ROLE]);

    return this.updateWithTenantScope(id, user, async (transaction, outlet) => {
      const updated = await transaction.outlet.update({
        where: { id: outlet.id },
        data: {
          status: dto.status,
          deletedAt: dto.status === OutletStatus.CLOSED ? new Date() : null,
          version: { increment: 1 },
        },
        select: outletSelect,
      });
      return this.toResponse(updated);
    });
  }

  private async updateWithTenantScope(
    id: string,
    user: AuthenticatedUser,
    operation: (
      transaction: Prisma.TransactionClient,
      outlet: { id: string; tenantId: string },
    ) => Promise<OutletResponseDto>,
  ): Promise<OutletResponseDto> {
    const trustedTenantId = hasRole(user, PLATFORM_ADMIN_ROLE)
      ? undefined
      : requireTenantId(user);

    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, user, trustedTenantId);
      const outlet = await transaction.outlet.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(trustedTenantId === undefined
            ? {}
            : { tenantId: trustedTenantId }),
        },
        select: { id: true, tenantId: true },
      });
      if (outlet === null) {
        throw new NotFoundException('Outlet not found');
      }

      return operation(transaction, outlet);
    });
  }

  private resolveWriteTenantId(
    requestedTenantId: string | undefined,
    user: AuthenticatedUser,
  ): string {
    if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
      if (requestedTenantId === undefined) {
        throw new BadRequestException(
          'tenantId is required for platform administrators',
        );
      }
      return requestedTenantId;
    }

    const tenantId = requireTenantId(user);
    if (requestedTenantId !== undefined && requestedTenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is forbidden');
    }
    return tenantId;
  }

  private resolveReadTenantId(
    requestedTenantId: string | undefined,
    user: AuthenticatedUser,
  ): string | undefined {
    if (hasRole(user, PLATFORM_ADMIN_ROLE)) {
      return requestedTenantId;
    }

    const tenantId = requireTenantId(user);
    if (requestedTenantId !== undefined && requestedTenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is forbidden');
    }
    return tenantId;
  }

  private generateCode(name: string): string {
    const base = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 23);
    return `${base === '' ? 'OUTLET' : base}_${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private toResponse(outlet: OutletRecord): OutletResponseDto {
    return outlet;
  }

  private throwSafePersistenceError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Outlet code already exists for this tenant');
    }

    throw error;
  }
}
