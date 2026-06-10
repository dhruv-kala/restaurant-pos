"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
];
async function main() {
    await prisma.$transaction(permissions.map(([permissionKey, module, description]) => prisma.permission.upsert({
        where: { permissionKey },
        update: { module, description },
        create: { permissionKey, module, description },
    })));
    console.log(`Seeded ${permissions.length} global permissions.`);
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map