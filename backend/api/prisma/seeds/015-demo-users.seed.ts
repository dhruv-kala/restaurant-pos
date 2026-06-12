import { MembershipStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SYSTEM_ROLES } from './005-roles.seed';
import { requireDemoValue, SeedContext } from './seed-context';

const DEMO_USERS = [
  ['admin@demo.com', 'Demo Admin', 'TENANT_ADMIN'],
  ['manager@demo.com', 'Demo Manager', 'MANAGER'],
  ['cashier@demo.com', 'Demo Cashier', 'CASHIER'],
  ['waiter@demo.com', 'Demo Waiter', 'WAITER'],
  ['kitchen@demo.com', 'Demo Kitchen', 'KITCHEN_STAFF'],
  ['inventory@demo.com', 'Demo Inventory Manager', 'INVENTORY_MANAGER'],
  ['hr@demo.com', 'Demo HR Manager', 'HR_MANAGER'],
] as const;

export async function seedDemoUsers(context: SeedContext): Promise<void> {
  const tenantId = requireDemoValue(context.demo.tenantId, 'tenant');
  const outletId = requireDemoValue(context.demo.outletId, 'outlet');
  const password = requireDemoValue(
    context.configuration.demoPassword,
    'development demo password',
  );
  const passwordHash = await bcrypt.hash(password, 12);
  const templates = await context.prisma.systemRoleTemplate.findMany({
    include: { permissionAssignments: true },
  });

  for (const [roleKey, name] of SYSTEM_ROLES) {
    if (roleKey === 'SUPER_ADMIN') {
      continue;
    }
    const role = await context.prisma.role.upsert({
      where: { tenantId_systemKey: { tenantId, systemKey: roleKey } },
      update: { name, isSystem: true, deletedAt: null },
      create: { tenantId, name, systemKey: roleKey, isSystem: true },
    });
    context.demo.roleIds[roleKey] = role.id;
    const template = templates.find(
      (candidate) => candidate.roleKey.toUpperCase() === roleKey,
    );
    if (!template) {
      throw new Error(`Missing system role template ${roleKey}`);
    }
    for (const assignment of template.permissionAssignments) {
      await context.prisma.rolePermission.upsert({
        where: {
          tenantId_roleId_permissionId: {
            tenantId,
            roleId: role.id,
            permissionId: assignment.permissionId,
          },
        },
        update: {},
        create: {
          tenantId,
          roleId: role.id,
          permissionId: assignment.permissionId,
        },
      });
    }
  }

  for (const [email, displayName, roleKey] of DEMO_USERS) {
    const user = await context.prisma.userAccount.upsert({
      where: { email },
      update: {
        displayName,
        passwordHash,
        status: UserStatus.ACTIVE,
        isPlatformAdmin: false,
        deletedAt: null,
      },
      create: {
        email,
        displayName,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });
    context.demo.userIds[roleKey] = user.id;
    if (roleKey === 'TENANT_ADMIN') {
      context.demo.adminUserId = user.id;
    }
    const membership = await context.prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      update: {
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        revokedAt: null,
      },
      create: {
        tenantId,
        userId: user.id,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const roleId = requireDemoValue(context.demo.roleIds[roleKey], roleKey);
    await context.prisma.membershipRole.upsert({
      where: {
        tenantId_membershipId_roleId: {
          tenantId,
          membershipId: membership.id,
          roleId,
        },
      },
      update: {},
      create: { tenantId, membershipId: membership.id, roleId },
    });
    await context.prisma.membershipOutlet.upsert({
      where: {
        tenantId_membershipId_outletId: {
          tenantId,
          membershipId: membership.id,
          outletId,
        },
      },
      update: {},
      create: { tenantId, membershipId: membership.id, outletId },
    });
  }
  console.log(`015: seeded ${DEMO_USERS.length} demo users and role assignments.`);
}
