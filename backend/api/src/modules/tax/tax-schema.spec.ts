import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('tax foundation schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260616020000_add_tax_foundation/migration.sql'),
    'utf8',
  );
  const rulesMigration = readFileSync(
    join(root, 'prisma/migrations/20260616040000_add_tax_rules_and_rates/migration.sql'),
    'utf8',
  );
  const fiscalMigration = readFileSync(
    join(root, 'prisma/migrations/20260616060000_add_fiscal_policy_administration/migration.sql'),
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

  it('defines tenant-scoped tax rates, groups, rules, and category mappings', () => {
    expect(schema).toContain('model TaxRate {');
    expect(schema).toContain('model TaxGroup {');
    expect(schema).toContain('model TaxGroupRate {');
    expect(schema).toContain('model TaxRule {');
    expect(schema).toContain('model TaxCategoryMapping {');
    expect(schema).toContain('enum TaxComponent {');
    expect(schema).toContain('TENANT_DEFAULT');
    expect(schema).toContain('taxCategoryMappings           TaxCategoryMapping[]');
  });

  it('creates tax rule tables with forced RLS and mapping target constraints', () => {
    for (const table of [
      'tax_rates',
      'tax_groups',
      'tax_group_rates',
      'tax_rules',
      'tax_category_mappings',
    ]) {
      expect(rulesMigration).toContain(`CREATE TABLE "${table}"`);
      expect(rulesMigration).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      expect(rulesMigration).toContain(`CREATE POLICY "${table}_tenant_isolation"`);
    }
    expect(rulesMigration).toContain('tax_category_mappings_target_check');
    expect(rulesMigration).toContain('"target" = \'TENANT_DEFAULT\'');
    expect(rulesMigration).toContain('tax_category_mappings_target_validity_idx');
    expect(rulesMigration).toContain('tax_rates_rate_bps_check');
    expect(rulesMigration).toContain('tax_group_rates_group_id_fkey');
  });

  it('defines outlet fiscal policies and fiscal invoice sequences', () => {
    expect(schema).toContain('model OutletFiscalPolicy {');
    expect(schema).toContain('model FiscalInvoiceSequence {');
    expect(schema).toContain('enum FiscalPolicyStatus {');
    expect(schema).toContain('enum FiscalInvoiceSequenceStatus {');
    expect(schema).toContain('outletFiscalPolicies          OutletFiscalPolicy[]');
    expect(schema).toContain('fiscalInvoiceSequences        FiscalInvoiceSequence[]');
  });

  it('creates fiscal policy tables with outlet scope, constraints, and forced RLS', () => {
    for (const table of ['outlet_fiscal_policies', 'fiscal_invoice_sequences']) {
      expect(fiscalMigration).toContain(`CREATE TABLE "${table}"`);
      expect(fiscalMigration).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      expect(fiscalMigration).toContain(`CREATE POLICY "${table}_tenant_isolation"`);
    }
    expect(fiscalMigration).toContain('outlet_fiscal_policies_outlet_id_fkey');
    expect(fiscalMigration).toContain('fiscal_invoice_sequences_outlet_year_prefix_key');
    expect(fiscalMigration).toContain('fiscal_invoice_sequences_last_number_check');
  });
});
