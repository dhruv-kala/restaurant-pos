import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  applyDatabaseRequestContext,
  hasRole,
  PLATFORM_ADMIN_ROLE,
} from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import type { CreateRoleDto } from '../dto/create-role.dto';
import type { RbacQueryDto } from '../dto/rbac-query.dto';
import type { UpdateRoleDto } from '../dto/update-role.dto';
import {
  requireRbacRead,
  requireRbacWrite,
  resolveRbacTenantId,
} from './rbac-access.util';

const roleInclude = {
  _count: {
    select: { membershipAssignments: true, permissionAssignments: true },
  },
} satisfies Prisma.RoleInclude;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto, actor: AuthenticatedUser): Promise<object> {
    requireRbacWrite(actor);
    const tenantId = resolveRbacTenantId(dto.tenantId, actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      try {
        return this.toResponse(
          await transaction.role.create({
            data: {
              tenantId,
              name: dto.name.trim(),
              systemKey: dto.code.toUpperCase(),
              description: dto.description?.trim(),
              isSystem: false,
            },
            include: roleInclude,
          }),
        );
      } catch (error: unknown) {
        this.throwConflict(error);
      }
    });
  }

  async findAll(query: RbacQueryDto, actor: AuthenticatedUser): Promise<object> {
    requireRbacRead(actor);
    const tenantId = resolveRbacTenantId(query.tenantId, actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const where: Prisma.RoleWhereInput = {
        tenantId,
        deletedAt: null,
        ...(query.search?.trim()
          ? {
              OR: [
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
                {
                  systemKey: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      };
      const [records, total] = await Promise.all([
        transaction.role.findMany({
          where,
          include: roleInclude,
          orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.role.count({ where }),
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
    const role = await this.withRole(id, actor, false);
    return this.toResponse(role);
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actor: AuthenticatedUser,
  ): Promise<object> {
    requireRbacWrite(actor);
    return this.withRole(id, actor, true, async (transaction, role) => {
      this.protectSystemRole(role.isSystem, actor);
      try {
        return this.toResponse(
          await transaction.role.update({
            where: { id },
            data: {
              name: dto.name?.trim(),
              systemKey: dto.code?.toUpperCase(),
              description: dto.description?.trim(),
              version: { increment: 1 },
            },
            include: roleInclude,
          }),
        );
      } catch (error: unknown) {
        this.throwConflict(error);
      }
    });
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<void> {
    requireRbacWrite(actor);
    await this.withRole(id, actor, true, async (transaction, role) => {
      if (role.isSystem) {
        throw new ForbiddenException('System roles cannot be deleted');
      }
      if (role._count.membershipAssignments > 0) {
        throw new ConflictException('Assigned roles cannot be deleted');
      }
      await transaction.role.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          version: { increment: 1 },
        },
      });
    });
  }

  async getPermissions(id: string, actor: AuthenticatedUser): Promise<object[]> {
    const role = await this.withRole(id, actor, false);
    const tenantId = role.tenantId;
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const assignments = await transaction.rolePermission.findMany({
        where: { tenantId, roleId: id },
        include: { permission: true },
        orderBy: [{ permission: { module: 'asc' } }, { permission: { action: 'asc' } }],
      });
      return assignments.map(({ permission }) => ({
        id: permission.id,
        module: permission.module,
        action: permission.action,
        code: permission.permissionKey,
        description: permission.description,
        isActive: permission.isActive,
      }));
    });
  }

  async assignPermissions(
    id: string,
    dto: AssignPermissionsDto,
    actor: AuthenticatedUser,
  ): Promise<object[]> {
    requireRbacWrite(actor);
    await this.withRole(id, actor, true, async (transaction, role) => {
      this.protectSystemRole(role.isSystem, actor);
      const uniqueIds = [...new Set(dto.permissionIds)];
      const permissions = await transaction.permission.findMany({
        where: { id: { in: uniqueIds }, isActive: true },
        select: { id: true },
      });
      if (permissions.length !== uniqueIds.length) {
        throw new NotFoundException('One or more permissions are unavailable');
      }
      if (!hasRole(actor, PLATFORM_ADMIN_ROLE)) {
        const tenantAdminTemplate =
          await transaction.systemRoleTemplate.findUnique({
            where: { roleKey: 'TENANT_ADMIN' },
            include: { permissionAssignments: true },
          });
        const allowed = new Set(
          tenantAdminTemplate?.permissionAssignments.map(
            (assignment) => assignment.permissionId,
          ) ?? [],
        );
        if (uniqueIds.some((permissionId) => !allowed.has(permissionId))) {
          throw new ForbiddenException(
            'Tenant administrators cannot grant platform-only permissions',
          );
        }
      }
      await transaction.rolePermission.deleteMany({
        where: { tenantId: role.tenantId, roleId: role.id },
      });
      if (uniqueIds.length) {
        await transaction.rolePermission.createMany({
          data: uniqueIds.map((permissionId) => ({
            tenantId: role.tenantId,
            roleId: role.id,
            permissionId,
          })),
        });
      }
    });
    return this.getPermissions(id, actor);
  }

  private async withRole<T = Prisma.RoleGetPayload<{ include: typeof roleInclude }>>(
    id: string,
    actor: AuthenticatedUser,
    write: boolean,
    operation?: (
      transaction: Prisma.TransactionClient,
      role: Prisma.RoleGetPayload<{ include: typeof roleInclude }>,
    ) => Promise<T>,
  ): Promise<T> {
    if (write) requireRbacWrite(actor);
    else requireRbacRead(actor);
    const tenantId = hasRole(actor, PLATFORM_ADMIN_ROLE)
      ? undefined
      : resolveRbacTenantId(undefined, actor);
    return this.prisma.$transaction(async (transaction) => {
      await applyDatabaseRequestContext(transaction, actor, tenantId);
      const role = await transaction.role.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(tenantId ? { tenantId } : {}),
        },
        include: roleInclude,
      });
      if (!role) throw new NotFoundException('Role not found');
      return operation
        ? operation(transaction, role)
        : (role as unknown as T);
    });
  }

  private protectSystemRole(
    isSystem: boolean,
    actor: AuthenticatedUser,
  ): void {
    if (isSystem && !hasRole(actor, PLATFORM_ADMIN_ROLE)) {
      throw new ForbiddenException(
        'Tenant administrators cannot modify system roles',
      );
    }
  }

  private toResponse(
    role: Prisma.RoleGetPayload<{ include: typeof roleInclude }>,
  ): object {
    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      code: role.systemKey,
      description: role.description,
      isSystemRole: role.isSystem,
      isActive: role.isActive,
      assignedUsersCount: role._count.membershipAssignments,
      assignedPermissionsCount: role._count.permissionAssignments,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private throwConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Role name or code already exists for this tenant',
      );
    }
    throw error;
  }
}
