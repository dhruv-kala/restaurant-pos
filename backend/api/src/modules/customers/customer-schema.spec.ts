import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('customer schema contract', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260612230000_add_customer_management',
      'migration.sql',
    ),
    'utf8',
  );

  it('defines customer profiles, addresses, notes, visits, and stats', () => {
    for (const model of [
      'Customer',
      'CustomerAddress',
      'CustomerNote',
      'CustomerVisit',
      'CustomerStats',
    ]) {
      expect(schema).toContain(`model ${model}`);
    }
  });

  it('prevents tenant-local phone and email duplicates', () => {
    expect(schema).toContain('@@unique([tenantId, phone])');
    expect(schema).toContain('@@unique([tenantId, email])');
  });

  it('makes payment visit recording idempotent', () => {
    expect(schema).toContain('@@unique([tenantId, paymentId])');
    expect(migration).toContain('customer_visits_payment_key');
  });

  it('enforces one live default address and forced tenant RLS', () => {
    expect(migration).toContain('customer_addresses_one_default_key');
    expect(migration).toContain(
      "EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name)",
    );
    expect(migration).toContain('app_tenant_access_allowed(tenant_id)');
  });
});
