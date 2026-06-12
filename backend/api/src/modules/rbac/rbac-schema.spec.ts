import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('RBAC schema and API contract', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma', 'schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260613140000_add_rbac_user_management',
      'migration.sql',
    ),
    'utf8',
  );

  it('reuses the normalized identity and access models', () => {
    for (const model of [
      'UserAccount',
      'TenantMembership',
      'Role',
      'Permission',
      'MembershipRole',
      'RolePermission',
      'MembershipOutlet',
    ]) {
      expect(schema).toContain(`model ${model}`);
    }
    expect(schema).not.toContain('model UserRole ');
    expect(schema).not.toContain('model UserOutletAccess ');
  });

  it('adds administrative role and permission metadata', () => {
    expect(schema).toContain('description String?');
    expect(schema).toContain('isActive    Boolean');
    expect(schema).toContain('action        String');
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'INACTIVE'");
  });

  it('keeps tenant-owned access tables under existing forced RLS', () => {
    const foundation = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260610120000_tenancy_authorization_foundation',
        'migration.sql',
      ),
      'utf8',
    );
    expect(foundation).toContain(
      'ALTER TABLE "roles" FORCE ROW LEVEL SECURITY',
    );
    expect(foundation).toContain(
      'ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY',
    );
    expect(foundation).toContain(
      'ALTER TABLE "membership_outlets" FORCE ROW LEVEL SECURITY',
    );
  });
});
