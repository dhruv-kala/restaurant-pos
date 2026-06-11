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

  it('adds tenant and outlet management fields with platform-admin RLS', () => {
    const tenantFields = models.get('Tenant')?.fields.map((field) => field.name);
    const outletFields = models.get('Outlet')?.fields.map((field) => field.name);
    const userFields = models
      .get('UserAccount')
      ?.fields.map((field) => field.name);
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260610180000_add_tenant_outlet_management',
        'migration.sql',
      ),
      'utf8',
    );

    expect(tenantFields).toEqual(
      expect.arrayContaining([
        'legalName',
        'email',
        'phone',
        'outletLimit',
      ]),
    );
    expect(outletFields).toEqual(
      expect.arrayContaining([
        'email',
        'phone',
        'addressLine1',
        'addressLine2',
        'city',
        'state',
        'country',
        'postalCode',
      ]),
    );
    expect(userFields).toContain('isPlatformAdmin');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION app_is_platform_admin()');
    expect(migration).toContain(
      'CREATE POLICY "outlets_tenant_or_platform_isolation"',
    );
    expect(migration).toContain(
      'ADD CONSTRAINT "tenants_outlet_limit_positive_check"',
    );
  });

  it('adds tenant-scoped menu models, money checks, and forced RLS', () => {
    const menuModels = [
      'MenuCategory',
      'MenuItem',
      'MenuItemVariant',
      'MenuItemAddon',
      'OutletMenuPrice',
    ];
    for (const modelName of menuModels) {
      expect(models.get(modelName)?.fields.map((field) => field.name)).toContain(
        'tenantId',
      );
    }

    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260611180000_add_menu_management',
        'migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "category_id")',
    );
    expect(migration).toContain(
      'CONSTRAINT "menu_items_price_minor_check" CHECK ("price_minor" > 0)',
    );
    expect(migration).toContain(
      'ALTER TABLE "menu_items" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'CREATE POLICY "outlet_menu_prices_tenant_isolation"',
    );
  });

  it('adds outlet-scoped table models, constraints, and forced RLS', () => {
    for (const modelName of [
      'TableSection',
      'DiningTable',
      'TableReservation',
      'MergedTable',
    ]) {
      const fields = models.get(modelName)?.fields.map((field) => field.name);
      expect(fields).toEqual(
        expect.arrayContaining(['tenantId', 'outletId', 'deletedAt']),
      );
    }

    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260611210000_add_table_management',
        'migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "outlet_id", "section_id")',
    );
    expect(migration).toContain(
      'CONSTRAINT "dining_tables_capacity_positive_check"',
    );
    expect(migration).toContain(
      'ALTER TABLE "table_reservations" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'CREATE POLICY "merged_tables_tenant_isolation"',
    );
  });
});
