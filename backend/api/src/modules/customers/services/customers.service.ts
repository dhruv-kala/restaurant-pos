import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateCustomerDto } from '../dto/create-customer.dto';
import type { CustomerQueryDto } from '../dto/customer-query.dto';
import type { UpdateCustomerDto } from '../dto/update-customer.dto';
import {
  requireCustomerCreate,
  requireCustomerRead,
  requireCustomerWrite,
  resolveCustomerScope,
} from './customer-access.util';

const customerInclude = {
  addresses: {
    where: { deletedAt: null },
    orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  stats: { include: { favoriteOutlet: { select: { id: true, name: true } } } },
} satisfies Prisma.CustomerInclude;
type CustomerRecord = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto, user: AuthenticatedUser) {
    requireCustomerCreate(user);
    const scope = resolveCustomerScope(dto.tenantId, undefined, user);
    if (!scope.tenantId) throw new BadRequestException('tenantId is required');
    const identity = this.identity(dto);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await applyDatabaseRequestContext(tx, user, scope.tenantId);
        const customer = await tx.customer.create({
          data: {
            tenantId: scope.tenantId!,
            ...identity,
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            anniversaryDate: dto.anniversaryDate
              ? new Date(dto.anniversaryDate)
              : undefined,
            gstNumber: dto.gstNumber?.trim().toUpperCase(),
            customerType: dto.customerType,
            status: dto.status,
            notes: dto.notes?.trim(),
            source: dto.source,
            smsOptIn: dto.smsOptIn,
            emailOptIn: dto.emailOptIn,
            whatsappOptIn: dto.whatsappOptIn,
          },
        });
        await tx.customerStats.create({
          data: {
            tenantId: customer.tenantId,
            customerId: customer.id,
          },
        });
        return this.map(await this.record(tx, customer.id, customer.tenantId));
      });
    } catch (error) {
      this.duplicate(error);
    }
  }

  async list(query: CustomerQueryDto, user: AuthenticatedUser) {
    requireCustomerRead(user);
    const scope = resolveCustomerScope(query.tenantId, query.outletId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const where = this.where(query, scope.tenantId);
      const [data, total] = await Promise.all([
        tx.customer.findMany({
          where,
          include: customerInclude,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.customer.count({ where }),
      ]);
      return {
        data: data.map((customer) => this.map(customer)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  search(query: CustomerQueryDto, user: AuthenticatedUser) {
    return this.list({ ...query, limit: Math.min(query.limit, 25) }, user);
  }

  async detail(id: string, user: AuthenticatedUser) {
    requireCustomerRead(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      return this.map(await this.record(tx, id, scope.tenantId));
    });
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthenticatedUser) {
    requireCustomerWrite(user);
    const scope = resolveCustomerScope(dto.tenantId, undefined, user);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await applyDatabaseRequestContext(tx, user, scope.tenantId);
        const existing = await this.record(tx, id, scope.tenantId);
        const firstName = dto.firstName?.trim() ?? existing.firstName;
        const lastName = dto.lastName?.trim() ?? existing.lastName;
        const displayName =
          dto.displayName?.trim() ||
          [firstName, lastName].filter(Boolean).join(' ') ||
          existing.displayName;
        return this.map(
          await tx.customer.update({
            where: { id },
            data: {
              firstName: dto.firstName?.trim(),
              lastName: dto.lastName?.trim(),
              displayName,
              phone: dto.phone === undefined ? undefined : this.phone(dto.phone),
              email: dto.email?.trim().toLowerCase(),
              gender: dto.gender,
              dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
              anniversaryDate: dto.anniversaryDate
                ? new Date(dto.anniversaryDate)
                : undefined,
              gstNumber: dto.gstNumber?.trim().toUpperCase(),
              customerType: dto.customerType,
              status: dto.status,
              notes: dto.notes?.trim(),
              source: dto.source,
              smsOptIn: dto.smsOptIn,
              emailOptIn: dto.emailOptIn,
              whatsappOptIn: dto.whatsappOptIn,
              version: { increment: 1 },
            },
            include: customerInclude,
          }),
        );
      });
    } catch (error) {
      this.duplicate(error);
    }
  }

  async remove(id: string, user: AuthenticatedUser) {
    requireCustomerWrite(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    await this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      await this.record(tx, id, scope.tenantId);
      await tx.customer.update({
        where: { id },
        data: {
          status: 'INACTIVE',
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
    });
  }

  orders(id: string, query: CustomerQueryDto, user: AuthenticatedUser) {
    return this.history(id, query, user, 'orders');
  }

  bills(id: string, query: CustomerQueryDto, user: AuthenticatedUser) {
    return this.history(id, query, user, 'bills');
  }

  payments(id: string, query: CustomerQueryDto, user: AuthenticatedUser) {
    return this.history(id, query, user, 'payments');
  }

  visits(id: string, query: CustomerQueryDto, user: AuthenticatedUser) {
    return this.history(id, query, user, 'visits');
  }

  async dashboard(user: AuthenticatedUser) {
    requireCustomerRead(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const base: Prisma.CustomerWhereInput = {
        deletedAt: null,
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      };
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 30);
      const [totalCustomers, newCustomers, vipCustomers, inactiveCustomers, repeatCustomers] =
        await Promise.all([
          tx.customer.count({ where: base }),
          tx.customer.count({ where: { ...base, createdAt: { gte: since } } }),
          tx.customer.count({ where: { ...base, customerType: 'VIP' } }),
          tx.customer.count({ where: { ...base, status: 'INACTIVE' } }),
          tx.customerStats.count({
            where: {
              totalOrders: { gte: 2 },
              ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
            },
          }),
        ]);
      return { totalCustomers, newCustomers, repeatCustomers, vipCustomers, inactiveCustomers };
    });
  }

  private async history(
    id: string,
    query: CustomerQueryDto,
    user: AuthenticatedUser,
    kind: 'orders' | 'bills' | 'payments' | 'visits',
  ) {
    requireCustomerRead(user);
    const scope = resolveCustomerScope(query.tenantId, query.outletId, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      await this.record(tx, id, scope.tenantId);
      const date = this.dateRange(query);
      const common = {
        ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
      };
      if (kind === 'orders') {
        return tx.order.findMany({
          where: { ...common, customerId: id, createdAt: date },
          include: { items: { where: { deletedAt: null } } },
          orderBy: { createdAt: 'desc' },
        });
      }
      if (kind === 'bills') {
        return tx.bill.findMany({
          where: { ...common, order: { customerId: id }, generatedAt: date },
          orderBy: { generatedAt: 'desc' },
        });
      }
      if (kind === 'payments') {
        return tx.payment.findMany({
          where: { ...common, bill: { order: { customerId: id } }, createdAt: date },
          include: { transactions: true, refunds: true },
          orderBy: { createdAt: 'desc' },
        });
      }
      return tx.customerVisit.findMany({
        where: { ...common, customerId: id, visitDate: date },
        include: { outlet: { select: { id: true, name: true } } },
        orderBy: { visitDate: 'desc' },
      });
    });
  }

  private where(query: CustomerQueryDto, tenantId?: string): Prisma.CustomerWhereInput {
    const search = query.search?.trim();
    const searchPhone = search ? this.phone(search) : '';
    return {
      deletedAt: null,
      ...(tenantId ? { tenantId } : {}),
      status: query.status,
      customerType: query.customerType,
      source: query.source,
      phone: query.phone ? this.phone(query.phone) : undefined,
      email: query.email?.trim().toLowerCase(),
      createdAt: this.dateRange(query),
      ...(query.name?.trim()
        ? { displayName: { contains: query.name.trim(), mode: 'insensitive' } }
        : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              ...(searchPhone ? [{ phone: { contains: searchPhone } }] : []),
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private identity(dto: CreateCustomerDto) {
    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const displayName =
      dto.displayName?.trim() ||
      [firstName, lastName].filter(Boolean).join(' ') ||
      dto.phone?.trim() ||
      dto.email?.trim();
    if (!displayName) {
      throw new BadRequestException('Name, phone, or email is required');
    }
    return {
      firstName,
      lastName,
      displayName,
      phone: dto.phone ? this.phone(dto.phone) : undefined,
      email: dto.email?.trim().toLowerCase(),
    };
  }

  private phone(value: string) {
    const normalized = value.replace(/[^\d+]/g, '');
    return normalized.startsWith('+')
      ? `+${normalized.slice(1).replace(/\D/g, '')}`
      : normalized.replace(/\D/g, '');
  }

  private dateRange(query: CustomerQueryDto) {
    return !query.fromDate && !query.toDate
      ? undefined
      : {
          gte: query.fromDate ? new Date(query.fromDate) : undefined,
          lte: query.toDate ? new Date(query.toDate) : undefined,
        };
  }

  private async record(tx: Prisma.TransactionClient, id: string, tenantId?: string) {
    const customer = await tx.customer.findFirst({
      where: { id, deletedAt: null, ...(tenantId ? { tenantId } : {}) },
      include: customerInclude,
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private duplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A customer with this phone or email already exists');
    }
    throw error;
  }

  private map(customer: CustomerRecord) {
    return {
      ...customer,
      addresses: customer.addresses.map((address) => ({
        ...address,
        latitude: address.latitude?.toNumber() ?? null,
        longitude: address.longitude?.toNumber() ?? null,
      })),
    };
  }
}
