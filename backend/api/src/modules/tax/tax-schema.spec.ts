import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('tax foundation schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260616020000_add_tax_foundation/migration.sql'),
    'utf8',
  );

  it('defines tenant-scoped tax profiles and base enums', () => {
    expect(schema).toContain('model TaxProfile {');
    expect(schema).toContain('enum TaxProfileStatus {');
    expect(schema).toContain('enum TaxType {');
    expect(schema).toContain('enum TaxMode {');
    expect(schema).toContain('taxProfiles                   TaxProfile[]');
  });

  it('creates tax profiles with tenant constraints and forced RLS', () => {
    expect(migration).toContain('CREATE TABLE "tax_profiles"');
    expect(migration).toContain('ALTER TABLE "tax_profiles" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "tax_profiles_tenant_isolation"');
    expect(migration).toContain('FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")');
  });

  it('enforces one active default profile per tenant', () => {
    expect(migration).toContain('tax_profiles_one_active_default_per_tenant_key');
    expect(migration).toContain('WHERE "is_default" = true AND "status" = \'ACTIVE\'');
    expect(migration).toContain('"is_default" = false OR "status" = \'ACTIVE\'');
  });
});
