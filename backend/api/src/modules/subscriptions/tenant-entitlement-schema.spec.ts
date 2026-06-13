import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('tenant feature entitlement schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260615060000_add_feature_entitlements/migration.sql'),
    'utf8',
  );

  it('defines tenant-scoped feature overrides with effective periods', () => {
    expect(schema).toContain('model TenantEntitlement {');
    expect(schema).toContain('featureKey');
    expect(schema).toContain('effectiveFrom');
    expect(schema).toContain('lastRequestFingerprint');
    expect(migration).toContain('tenant_entitlements_period_check');
    expect(migration).toContain('tenant_entitlements_limit_check');
  });

  it('enforces tenant isolation and revoke-instead-of-delete history', () => {
    expect(migration).toContain(
      'ALTER TABLE "tenant_entitlements" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain('CREATE POLICY "tenant_entitlements_tenant_isolation"');
    expect(migration).toContain('tenant_entitlements_no_delete');
    expect(migration).toContain('must be revoked instead of deleted');
  });

  it('protects feature and command uniqueness per tenant', () => {
    expect(migration).toContain('tenant_entitlements_tenant_feature_key');
    expect(migration).toContain('tenant_entitlements_idempotency_key');
    expect(migration).toContain('tenant_entitlements_tenant_id_fkey');
    expect(migration).toContain('ON DELETE RESTRICT');
  });
});
