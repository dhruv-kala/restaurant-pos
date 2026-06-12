import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  applyDatabaseRequestContext,
  hasRole,
  PLATFORM_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AssignOutletAccessDto } from '../dto/assign-outlet-access.dto';
import type { AssignRoleDto } from '../dto/assign-role.dto';
import {
  requireRbacRead,
  requireRbacWrite,
  resolveRbacTenantId,
} from './rbac-access.util';

@Injectable()
export class UserAccessService {
  constructor(private readonly prisma: PrismaService) {}

  getRoles(userId: string, actor: AuthenticatedUser): Promise<object[]> {
    return this.withMembership(userId, actor, false, async (tx, membership) => {
      const assignments = await tx.membershipRole.findMany({
        where: { tenantId: membership.tenantId, membershipId: membership.id },
        include: { role: true },
        orderBy: { role: { name: 'asc' } },
      });
      return assignments.map(({ role }) => ({
        id: role.id,
        name: role.name,
        code: role.systemKey,
        description: role.description,
        isSystemRole: role.isSystem,
        isActive: role.isActive,
      }));
    });
  }

  assignRoles(
    userId: string,
    dto: AssignRoleDto,
    actor: AuthenticatedUser,
  ): Promise<object[]> {
    return this.withMembership(userId, actor, true, async (tx, membership) => {
      const roleIds = [...new Set(dto.roleIds)];
      const count = await tx.role.count({
        where: {
          tenantId: membership.tenantId,
          id: { in: roleIds },
          isActive: true,
          deletedAt: null,
        },
      });
      if (count !== roleIds.length) {
        throw new NotFoundException('One or more roles are unavailable');
      }
      await tx.membershipRole.deleteMany({
        where: { tenantId: membership.tenantId, membershipId: membership.id },
      });
      await tx.membershipRole.createMany({
        data: roleIds.map((roleId) => ({
          tenantId: membership.tenantId,
          membershipId: membership.id,
          roleId,
        })),
      });
      return tx.membershipRole
        .findMany({
          where: { tenantId: membership.tenantId, membershipId: membership.id },
          include: { role: true },
          orderBy: { role: { name: 'asc' } },
        })
        .then((items) =>
          items.map(({ role }) => ({
            id: role.id,
            name: role.name,
            code: role.systemKey,
            description: role.description,
            isSystemRole: role.isSystem,
            isActive: role.isActive,
          })),
        );
    });
  }

  getOutlets(userId: string, actor: AuthenticatedUser): Promise<object[]> {
    return this.withMembership(userId, actor, false, async (tx, membership) => {
      const assignments = await tx.membershipOutlet.findMany({
        where: { tenantId: membership.tenantId, membershipId: membership.id },
        include: { outlet: true },
        orderBy: { outlet: { name: 'asc' } },
      });
      return assignments.map(({ outlet }) => ({
        id: outlet.id,
        tenantId: outlet.tenantId,
        name: outlet.name,
        code: outlet.code,
      }));
    });
  }

  assignOutlets(
    userId: string,
    dto: AssignOutletAccessDto,
    actor: AuthenticatedUser,
  ): Promise<object[]> {
    return this.withMembership(userId, actor, true, async (tx, membership) => {
      const outletIds = [...new Set(dto.outletIds)];
      const count = await tx.outlet.count({
        where: {
          tenantId: membership.tenantId,
          id: { in: outletIds },
          deletedAt: null,
        },
      });
      if (count !== outletIds.length) {
        throw new NotFoundException('One or more outlets are unavailable');
      }
      await tx.membershipOutlet.deleteMany({
        where: { tenantId: membership.tenantId, membershipId: membership.id },
      });
      if (outletIds.length) {
        await tx.membershipOutlet.createMany({
          data: outletIds.map((outletId) => ({
            tenantId: membership.tenantId,
            membershipId: membership.id,
            outletId,
          })),
        });
      }
      return tx.membershipOutlet
        .findMany({
          where: { tenantId: membership.tenantId, membershipId: membership.id },
          include: { outlet: true },
          orderBy: { outlet: { name: 'asc' } },
        })
        .then((items) =>
          items.map(({ outlet }) => ({
            id: outlet.id,
            tenantId: outlet.tenantId,
            name: outlet.name,
            code: outlet.code,
          })),
        );
    });
  }

  private async withMembership<T>(
    userId: string,
    actor: AuthenticatedUser,
    write: boolean,
    operation: (
      transaction: Prisma.TransactionClient,
      membership: { id: string; tenantId: string },
    ) => Promise<T>,
  ): Promise<T> {
    if (write) requireRbacWrite(actor);
    else requireRbacRead(actor);
    const tenantId = hasRole(actor, PLATFORM_ADMIN_ROLE)
      ? undefined
      : resolveRbacTenantId(undefined, actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const membership = await transaction.tenantMembership.findFirst({
        where: { userId, ...(tenantId ? { tenantId } : {}) },
        select: { id: true, tenantId: true },
      });
      if (!membership) throw new NotFoundException('User membership not found');
      return operation(transaction, membership);
    });
  }
}
