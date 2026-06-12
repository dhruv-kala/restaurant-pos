import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateVendorDto, UpdateVendorDto } from '../dto/create-vendor.dto';
import type { InventoryQueryDto } from '../dto/inventory-query.dto';
import {
  requireInventoryRead,
  requireInventoryWrite,
  resolveInventoryScope,
} from './inventory-access.util';
import { pageMeta } from './inventory-response.util';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVendorDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const tenantId = this.tenant(dto.tenantId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, tenantId);
      return tx.vendor.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          email: dto.email?.trim().toLowerCase(),
          phone: dto.phone?.trim(),
          gstNumber: dto.gstNumber?.trim().toUpperCase(),
          address: dto.address?.trim(),
          contactPerson: dto.contactPerson?.trim(),
          isActive: dto.isActive,
          createdByUserId: user.id,
          updatedByUserId: user.id,
        },
      });
    });
  }

  async findAll(query: InventoryQueryDto, user: AuthenticatedUser) {
    requireInventoryRead(user);
    const scope = resolveInventoryScope(query.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where: Prisma.VendorWhereInput = {
        deletedAt: null,
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
                { contactPerson: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.vendor.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.vendor.count({ where }),
      ]);
      return { data, meta: pageMeta(query.page, query.limit, total) };
    });
  }

  async update(id: string, dto: UpdateVendorDto, user: AuthenticatedUser) {
    requireInventoryWrite(user);
    const scope = resolveInventoryScope(dto.tenantId, undefined, user, false);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const vendor = await tx.vendor.findFirst({
        where: { id, deletedAt: null, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
      });
      if (!vendor) throw new NotFoundException('Vendor not found');
      return tx.vendor.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          email: dto.email?.trim().toLowerCase(),
          phone: dto.phone?.trim(),
          gstNumber: dto.gstNumber?.trim().toUpperCase(),
          address: dto.address?.trim(),
          contactPerson: dto.contactPerson?.trim(),
          isActive: dto.isActive,
          updatedByUserId: user.id,
          version: { increment: 1 },
        },
      });
    });
  }

  private tenant(requested: string | undefined, user: AuthenticatedUser): string {
    const tenantId = resolveInventoryScope(requested, undefined, user, false).tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return tenantId;
  }
}
