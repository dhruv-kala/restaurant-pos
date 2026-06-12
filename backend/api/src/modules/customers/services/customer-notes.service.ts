import { Injectable, NotFoundException } from '@nestjs/common';
import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateCustomerNoteDto } from '../dto/create-customer-note.dto';
import {
  requireCustomerCreate,
  requireCustomerRead,
  resolveCustomerScope,
} from './customer-access.util';

@Injectable()
export class CustomerNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateCustomerNoteDto, user: AuthenticatedUser) {
    requireCustomerCreate(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      const customer = await tx.customer.findFirst({
        where: {
          id: customerId,
          deletedAt: null,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
      });
      if (!customer) throw new NotFoundException('Customer not found');
      return tx.customerNote.create({
        data: {
          tenantId: customer.tenantId,
          customerId,
          note: dto.note.trim(),
          createdByUserId: user.id,
        },
        include: { createdBy: { select: { id: true, displayName: true } } },
      });
    });
  }

  async list(customerId: string, user: AuthenticatedUser) {
    requireCustomerRead(user);
    const scope = resolveCustomerScope(undefined, undefined, user);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, user, scope.tenantId);
      return tx.customerNote.findMany({
        where: {
          customerId,
          ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
        },
        include: { createdBy: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });
  }
}
