import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import {
  applyDatabaseRequestContext,
  hasRole,
  PLATFORM_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { InviteUserDto } from '../dto/invite-user.dto';
import type { RbacQueryDto } from '../dto/rbac-query.dto';
import type { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import {
  managerOutletId,
  requireRbacRead,
  requireRbacWrite,
  resolveRbacTenantId,
} from './rbac-access.util';

const membershipInclude = {
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      displayName: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  roleAssignments: {
    include: {
      role: {
        select: {
          id: true,
          name: true,
          systemKey: true,
          isSystem: true,
          isActive: true,
        },
      },
    },
  },
  outletAssignments: {
    include: {
      outlet: { select: { id: true, name: true, code: true } },
    },
  },
} satisfies Prisma.TenantMembershipInclude;

type MembershipRecord = Prisma.TenantMembershipGetPayload<{
  include: typeof membershipInclude;
}>;

@Injectable()
export class UsersManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<object> {
    requireRbacWrite(actor);
    return this.createMembershipUser(dto, actor, dto.password, false);
  }

  async invite(dto: InviteUserDto, actor: AuthenticatedUser): Promise<object> {
    requireRbacWrite(actor);
    return this.createMembershipUser(dto, actor, undefined, true);
  }

  async findAll(query: RbacQueryDto, actor: AuthenticatedUser): Promise<object> {
    requireRbacRead(actor);
    const tenantId = resolveRbacTenantId(query.tenantId, actor);
    const managerOutlet = managerOutletId(actor);
    if (managerOutlet && query.outletId && query.outletId !== managerOutlet) {
      throw new ForbiddenException('Managers can view only their outlet');
    }
    const outletId = managerOutlet ?? query.outletId;
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const where: Prisma.TenantMembershipWhereInput = {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.roleId
          ? { roleAssignments: { some: { roleId: query.roleId } } }
          : {}),
        ...(outletId
          ? { outletAssignments: { some: { outletId } } }
          : {}),
        ...(query.search?.trim()
          ? {
              user: {
                OR: [
                  { displayName: { contains: query.search.trim(), mode: 'insensitive' } },
                  { email: { contains: query.search.trim(), mode: 'insensitive' } },
                  { phone: { contains: query.search.trim() } },
                ],
              },
            }
          : {}),
      };
      const [records, total] = await Promise.all([
        transaction.tenantMembership.findMany({
          where,
          include: membershipInclude,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.tenantMembership.count({ where }),
      ]);
      return {
        data: records.map((record) => this.toResponse(record)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<object> {
    requireRbacRead(actor);
    const tenantId = hasRole(actor, PLATFORM_ADMIN_ROLE)
      ? undefined
      : resolveRbacTenantId(undefined, actor);
    const managerOutlet = managerOutletId(actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const record = await transaction.tenantMembership.findFirst({
        where: {
          ...(tenantId ? { tenantId } : {}),
          userId: id,
          ...(managerOutlet
            ? { outletAssignments: { some: { outletId: managerOutlet } } }
            : {}),
        },
        include: membershipInclude,
      });
      if (!record) throw new NotFoundException('User membership not found');
      return this.toResponse(record);
    });
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<object> {
    requireRbacWrite(actor);
    const tenantId = hasRole(actor, PLATFORM_ADMIN_ROLE)
      ? undefined
      : resolveRbacTenantId(undefined, actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const membership = await this.findMembership(transaction, tenantId, id);
      try {
        await transaction.userAccount.update({
          where: { id: membership.userId },
          data: {
            displayName: dto.name?.trim(),
            ...(hasRole(actor, PLATFORM_ADMIN_ROLE)
              ? { email: dto.email?.toLowerCase(), phone: dto.phone }
              : {}),
            version: { increment: 1 },
          },
        });
      } catch (error: unknown) {
        this.throwUserConflict(error);
      }
      const updated = await transaction.tenantMembership.findUniqueOrThrow({
        where: { id: membership.id },
        include: membershipInclude,
      });
      return this.toResponse(updated);
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor: AuthenticatedUser,
  ): Promise<object> {
    requireRbacWrite(actor);
    const tenantId = hasRole(actor, PLATFORM_ADMIN_ROLE)
      ? undefined
      : resolveRbacTenantId(undefined, actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const membership = await this.findMembership(transaction, tenantId, id);
      const updated = await transaction.tenantMembership.update({
        where: { id: membership.id },
        data: {
          status: dto.status,
          joinedAt:
            dto.status === MembershipStatus.ACTIVE
              ? membership.joinedAt ?? new Date()
              : membership.joinedAt,
          revokedAt:
            dto.status === MembershipStatus.REVOKED ? new Date() : null,
          version: { increment: 1 },
        },
        include: membershipInclude,
      });
      return this.toResponse(updated);
    });
  }

  async resetPassword(id: string, actor: AuthenticatedUser): Promise<object> {
    requireRbacWrite(actor);
    const tenantId = hasRole(actor, PLATFORM_ADMIN_ROLE)
      ? undefined
      : resolveRbacTenantId(undefined, actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const membership = await this.findMembership(transaction, tenantId, id);
      const membershipCount = await transaction.tenantMembership.count({
        where: {
          userId: membership.userId,
          status: { not: MembershipStatus.REVOKED },
        },
      });
      if (
        membershipCount > 1 &&
        !hasRole(actor, PLATFORM_ADMIN_ROLE)
      ) {
        throw new ForbiddenException(
          'Platform administrator approval is required for multi-tenant password reset',
        );
      }
      const temporarySecret = randomBytes(32).toString('base64url');
      await transaction.userAccount.update({
        where: { id: membership.userId },
        data: {
          passwordHash: await bcrypt.hash(temporarySecret, 12),
          status: UserStatus.INVITED,
          version: { increment: 1 },
        },
      });
      await transaction.tenantMembership.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.INVITED, version: { increment: 1 } },
      });
      return {
        userId: membership.userId,
        resetRequired: true,
        message:
          'Password reset initialized. Deliver a reset link through the configured notification provider.',
      };
    });
  }

  private async createMembershipUser(
    dto: CreateUserDto | InviteUserDto,
    actor: AuthenticatedUser,
    password: string | undefined,
    invited: boolean,
  ): Promise<object> {
    const tenantId = resolveRbacTenantId(dto.tenantId, actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      await this.validateAssignments(
        transaction,
        tenantId,
        dto.roleIds,
        dto.outletIds ?? [],
      );
      const existingMembership = await transaction.tenantMembership.findFirst({
        where: { tenantId, user: { email: dto.email.toLowerCase() } },
      });
      if (existingMembership) {
        throw new ConflictException('User already belongs to this tenant');
      }
      let user;
      try {
        user = await transaction.userAccount.upsert({
          where: { email: dto.email.toLowerCase() },
          update: {
            displayName: dto.name.trim(),
            phone: dto.phone,
            ...(password
              ? {
                  passwordHash: await bcrypt.hash(password, 12),
                  status: UserStatus.ACTIVE,
                }
              : {}),
            deletedAt: null,
          },
          create: {
            email: dto.email.toLowerCase(),
            phone: dto.phone,
            displayName: dto.name.trim(),
            passwordHash: password ? await bcrypt.hash(password, 12) : null,
            status: password ? UserStatus.ACTIVE : UserStatus.INVITED,
          },
        });
      } catch (error: unknown) {
        this.throwUserConflict(error);
      }
      const membership = await transaction.tenantMembership.create({
        data: {
          tenantId,
          userId: user.id,
          status:
            invited || !password
              ? MembershipStatus.INVITED
              : MembershipStatus.ACTIVE,
          joinedAt: password ? new Date() : null,
        },
      });
      await transaction.membershipRole.createMany({
        data: dto.roleIds.map((roleId) => ({
          tenantId,
          membershipId: membership.id,
          roleId,
        })),
      });
      if (dto.outletIds?.length) {
        await transaction.membershipOutlet.createMany({
          data: dto.outletIds.map((outletId) => ({
            tenantId,
            membershipId: membership.id,
            outletId,
          })),
        });
      }
      const created = await transaction.tenantMembership.findUniqueOrThrow({
        where: { id: membership.id },
        include: membershipInclude,
      });
      return this.toResponse(created);
    });
  }

  private async validateAssignments(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    roleIds: string[],
    outletIds: string[],
  ): Promise<void> {
    const [roleCount, outletCount] = await Promise.all([
      transaction.role.count({
        where: {
          tenantId,
          id: { in: roleIds },
          isActive: true,
          deletedAt: null,
        },
      }),
      transaction.outlet.count({
        where: { tenantId, id: { in: outletIds }, deletedAt: null },
      }),
    ]);
    if (roleCount !== new Set(roleIds).size) {
      throw new NotFoundException('One or more roles are unavailable');
    }
    if (outletCount !== new Set(outletIds).size) {
      throw new NotFoundException('One or more outlets are unavailable');
    }
  }

  private async findMembership(
    transaction: Prisma.TransactionClient,
    tenantId: string | undefined,
    userId: string,
  ): Promise<MembershipRecord> {
    const membership = await transaction.tenantMembership.findFirst({
      where: { userId, ...(tenantId ? { tenantId } : {}) },
      include: membershipInclude,
    });
    if (!membership) throw new NotFoundException('User membership not found');
    return membership;
  }

  private toResponse(record: MembershipRecord): object {
    return {
      id: record.user.id,
      membershipId: record.id,
      tenantId: record.tenantId,
      email: record.user.email,
      phone: record.user.phone,
      name: record.user.displayName,
      status: record.status,
      roles: record.roleAssignments.map(({ role }) => ({
        id: role.id,
        name: role.name,
        code: role.systemKey,
        isSystemRole: role.isSystem,
        isActive: role.isActive,
      })),
      outlets: record.outletAssignments.map(({ outlet }) => outlet),
      createdAt: record.user.createdAt,
      updatedAt: record.user.updatedAt,
    };
  }

  private throwUserConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email or phone is already in use');
    }
    throw error;
  }
}
