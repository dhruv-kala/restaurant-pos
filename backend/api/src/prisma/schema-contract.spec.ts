import { Prisma } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Prisma tenancy and authorization schema', () => {
  const models = new Map(
    Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
  );

  it('contains the Task 6 models', () => {
    expect([...models.keys()]).toEqual(
      expect.arrayContaining([
        'Tenant',
        'Outlet',
        'UserAccount',
        'RefreshToken',
        'TenantMembership',
        'Role',
        'Permission',
        'MembershipRole',
        'RolePermission',
        'MembershipOutlet',
      ]),
    );
  });

  it.each([
    'Outlet',
    'TenantMembership',
    'Role',
    'MembershipRole',
    'RolePermission',
    'MembershipOutlet',
  ])('%s carries explicit tenant scope', (modelName) => {
    const model = models.get(modelName);

    expect(model?.fields.some((field) => field.name === 'tenantId')).toBe(true);
  });

  it('keeps user accounts and permissions global', () => {
    expect(
      models
        .get('UserAccount')
        ?.fields.some((field) => field.name === 'tenantId'),
    ).toBe(false);
    expect(
      models
        .get('Permission')
        ?.fields.some((field) => field.name === 'tenantId'),
    ).toBe(false);
  });

  it('uses composite tenant-aware relations for assignment tables', () => {
    const relationFieldNames = ['membership', 'role', 'outlet'];

    for (const modelName of [
      'MembershipRole',
      'RolePermission',
      'MembershipOutlet',
    ]) {
      const model = models.get(modelName);
      const relationFields = model?.fields.filter(
        (field) =>
          field.kind === 'object' && relationFieldNames.includes(field.name),
      );

      for (const field of relationFields ?? []) {
        if (field.name !== 'permission') {
          expect(field.relationFromFields).toContain('tenantId');
        }
      }
    }
  });

  it('migrates tenant constraints and forced row-level security', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260610120000_tenancy_authorization_foundation',
        'migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('CREATE OR REPLACE FUNCTION app_uuid_v7()');
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "membership_id")',
    );
    expect(migration).toContain(
      'ALTER TABLE "tenant_memberships" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'CREATE POLICY "role_permissions_tenant_isolation"',
    );
    expect(migration).toContain(
      'CONSTRAINT "user_accounts_identity_required_check"',
    );
  });

  it('adds hashed, revocable refresh-token persistence', () => {
    const refreshToken = models.get('RefreshToken');
    const fieldNames = refreshToken?.fields.map((field) => field.name);
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260610150000_add_refresh_tokens',
        'migration.sql',
      ),
      'utf8',
    );

    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'userId',
        'tokenHash',
        'expiresAt',
        'revokedAt',
        'replacedByTokenId',
      ]),
    );
    expect(fieldNames).not.toContain('token');
    expect(migration).toContain(
      'CREATE POLICY "tenant_memberships_tenant_or_user_isolation"',
    );
    expect(migration).toContain('"user_id" = app_current_user_id()');
  });
});
