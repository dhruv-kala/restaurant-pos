import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateCustomerAddressDto } from '../dto/create-customer-address.dto';
import type { UpdateCustomerAddressDto } from '../dto/update-customer-address.dto';
import {
  requireCustomerRead,
  requireCustomerWrite,
  resolveCustomerScope,
} from './customer-access.util';

@Injectable()
export class CustomerAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateCustomerAddressDto, user: AuthenticatedUser) {
    requireCustomerWrite(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const customer = await this.customer(tx, customerId, scope.tenantId);
      const count = await tx.customerAddress.count({
        where: { tenantId: customer.tenantId, customerId, deletedAt: null },
      });
      const makeDefault = dto.isDefault || count === 0;
      if (makeDefault) await this.clearDefault(tx, customer.tenantId, customerId);
      return this.map(
        await tx.customerAddress.create({
          data: {
            tenantId: customer.tenantId,
            customerId,
            label: dto.label.trim(),
            addressLine1: dto.addressLine1.trim(),
            addressLine2: dto.addressLine2?.trim(),
            city: dto.city?.trim(),
            state: dto.state?.trim(),
            country: dto.country?.trim().toUpperCase(),
            postalCode: dto.postalCode?.trim(),
            latitude: dto.latitude,
            longitude: dto.longitude,
            isDefault: makeDefault,
          },
        }),
      );
    });
  }

  async list(customerId: string, user: AuthenticatedUser) {
    requireCustomerRead(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      await this.customer(tx, customerId, scope.tenantId);
      const rows = await tx.customerAddress.findMany({
        where: {
          customerId,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      return rows.map((row) => this.map(row));
    });
  }

  async update(addressId: string, dto: UpdateCustomerAddressDto, user: AuthenticatedUser) {
    requireCustomerWrite(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const address = await tx.customerAddress.findFirst({
        where: {
          id: addressId,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
      });
      if (!address) throw new NotFoundException('Customer address not found');
      if (dto.isDefault) await this.clearDefault(tx, address.tenantId, address.customerId);
      return this.map(
        await tx.customerAddress.update({
          where: { id: addressId },
          data: { ...this.data(dto), version: { increment: 1 } },
        }),
      );
    });
  }

  async remove(addressId: string, user: AuthenticatedUser) {
    requireCustomerWrite(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const address = await tx.customerAddress.findFirst({
        where: {
          id: addressId,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
      });
      if (!address) throw new NotFoundException('Customer address not found');
      await tx.customerAddress.update({
        where: { id: addressId },
        data: { deletedAt: new Date(), isDefault: false, version: { increment: 1 } },
      });
    });
  }

  private customer(tx: Prisma.TransactionClient, id: string, tenantId?: string) {
    return tx.customer
      .findFirst({ where: { id, deletedAt: null, ...(tenantId ? { tenantId } : {}) } })
      .then((row) => {
        if (!row) throw new NotFoundException('Customer not found');
        return row;
      });
  }

  private clearDefault(tx: Prisma.TransactionClient, tenantId: string, customerId: string) {
    return tx.customerAddress.updateMany({
      where: { tenantId, customerId, isDefault: true, deletedAt: null },
      data: { isDefault: false, version: { increment: 1 } },
    });
  }

  private data(dto: UpdateCustomerAddressDto) {
    return {
      label: dto.label?.trim(),
      addressLine1: dto.addressLine1?.trim(),
      addressLine2: dto.addressLine2?.trim(),
      city: dto.city?.trim(),
      state: dto.state?.trim(),
      country: dto.country?.trim().toUpperCase(),
      postalCode: dto.postalCode?.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      isDefault: dto.isDefault,
    };
  }

  private map<T extends { latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null }>(
    row: T,
  ) {
    return {
      ...row,
      latitude: row.latitude?.toNumber() ?? null,
      longitude: row.longitude?.toNumber() ?? null,
    };
  }
}
