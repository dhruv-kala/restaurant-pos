import {
  MembershipStatus,
  PrismaClient,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const permissions = [
  ['tenants.read', 'tenants', 'View tenant settings'],
  ['tenants.update', 'tenants', 'Update tenant settings'],
  ['outlets.create', 'outlets', 'Create outlets'],
  ['outlets.read', 'outlets', 'View outlets'],
  ['outlets.update', 'outlets', 'Update outlets'],
  ['outlets.archive', 'outlets', 'Archive outlets'],
  ['users.invite', 'users', 'Invite tenant members'],
  ['users.read', 'users', 'View tenant members'],
  ['users.update', 'users', 'Update tenant members'],
  ['users.revoke', 'users', 'Revoke tenant memberships'],
  ['roles.create', 'roles', 'Create tenant roles'],
  ['roles.read', 'roles', 'View roles and permissions'],
  ['roles.update', 'roles', 'Update role permissions'],
  ['roles.delete', 'roles', 'Archive tenant roles'],
] as const;

const LOCAL_ADMIN_EMAIL = 'admin@example.com';
const LOCAL_ADMIN_PASSWORD = 'Admin@123';

async function main(): Promise<void> {
  await prisma.$transaction(
    permissions.map(([permissionKey, module, description]) =>
      prisma.permission.upsert({
        where: { permissionKey },
        update: { module, description },
        create: { permissionKey, module, description },
      }),
    ),
  );

  console.log(`Seeded ${permissions.length} global permissions.`);

  if (process.env.NODE_ENV === 'production') {
    console.log('Skipped local development tenant and admin seed in production.');
    return;
  }

  const passwordHash = await bcrypt.hash(LOCAL_ADMIN_PASSWORD, 12);
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'local-demo' },
    update: {
      name: 'Local Demo Restaurant',
      status: 'ACTIVE',
      deletedAt: null,
    },
    create: {
      slug: 'local-demo',
      name: 'Local Demo Restaurant',
    },
  });
  const outlet = await prisma.outlet.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'MAIN',
      },
    },
    update: {
      name: 'Main Outlet',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      deletedAt: null,
    },
    create: {
      tenantId: tenant.id,
      code: 'MAIN',
      name: 'Main Outlet',
      timezone: 'Asia/Kolkata',
    },
  });
  const role = await prisma.role.upsert({
    where: {
      tenantId_systemKey: {
        tenantId: tenant.id,
        systemKey: 'tenant_admin',
      },
    },
    update: {
      name: 'Tenant Admin',
      isSystem: true,
      deletedAt: null,
    },
    create: {
      tenantId: tenant.id,
      name: 'Tenant Admin',
      systemKey: 'tenant_admin',
      isSystem: true,
    },
  });
  const user = await prisma.userAccount.upsert({
    where: { email: LOCAL_ADMIN_EMAIL },
    update: {
      displayName: 'Admin User',
      passwordHash,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      email: LOCAL_ADMIN_EMAIL,
      displayName: 'Admin User',
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });
  const membership = await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: {
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
      revokedAt: null,
    },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  await prisma.$transaction([
    prisma.membershipRole.upsert({
      where: {
        tenantId_membershipId_roleId: {
          tenantId: tenant.id,
          membershipId: membership.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        membershipId: membership.id,
        roleId: role.id,
      },
    }),
    prisma.membershipOutlet.upsert({
      where: {
        tenantId_membershipId_outletId: {
          tenantId: tenant.id,
          membershipId: membership.id,
          outletId: outlet.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        membershipId: membership.id,
        outletId: outlet.id,
      },
    }),
  ]);

  console.log(
    `Seeded local development admin ${LOCAL_ADMIN_EMAIL} with the documented development password.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
