import { Injectable } from '@nestjs/common';

import { requireRbacRead } from './rbac-access.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: AuthenticatedUser): Promise<object[]> {
    requireRbacRead(actor);
    const permissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    return permissions.map((permission) => ({
      id: permission.id,
      module: permission.module,
      action: permission.action,
      code: permission.permissionKey,
      description: permission.description,
      isActive: permission.isActive,
    }));
  }

  async grouped(actor: AuthenticatedUser): Promise<Record<string, object[]>> {
    const permissions = await this.findAll(actor);
    return permissions.reduce<Record<string, object[]>>((groups, permission) => {
      const module = String((permission as { module: string }).module).toUpperCase();
      (groups[module] ??= []).push(permission);
      return groups;
    }, {});
  }
}
