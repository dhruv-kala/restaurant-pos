import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('business day foundation schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260616100000_add_business_day_foundation/migration.sql'),
    'utf8',
  );

  it('defines outlet-scoped business days', () => {
    expect(schema).toContain('enum BusinessDayStatus {');
    expect(schema).toContain('model BusinessDay {');
    expect(schema).toContain('businessDays                  BusinessDay[]');
    expect(schema).toContain('businessDays             BusinessDay[]');
    expect(schema).toContain('openedBusinessDays');
    expect(schema).toContain('closedBusinessDays');
  });

  it('creates business days with tenant constraints and forced RLS', () => {
    expect(migration).toContain('CREATE TABLE "business_days"');
    expect(migration).toContain('FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")');
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id")',
    );
    expect(migration).toContain('ALTER TABLE "business_days" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "business_days_tenant_isolation"');
  });

  it('enforces one open day per outlet and closed-day immutability', () => {
    expect(migration).toContain('business_days_one_open_per_outlet_key');
    expect(migration).toContain('WHERE "status" = \'OPEN\'');
    expect(migration).toContain('reject_closed_business_day_mutation');
    expect(migration).toContain('closed business days are immutable');
    expect(migration).toContain('business days cannot be deleted');
  });
});
