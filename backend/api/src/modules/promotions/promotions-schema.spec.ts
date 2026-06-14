import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('promotions discount policy foundation schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      root,
      'prisma/migrations/20260615180000_add_promotions_discount_policy_foundation/migration.sql',
    ),
    'utf8',
  );

  it('defines discount policies and immutable application snapshots', () => {
    expect(schema).toContain('model DiscountPolicy {');
    expect(schema).toContain('model DiscountApplication {');
    expect(schema).toContain('enum DiscountValueType {');
  });

  it('forces tenant row-level security on promotion tables', () => {
    expect(migration).toContain('ALTER TABLE "discount_policies" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE "discount_applications" FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "discount_policies_tenant_isolation"');
    expect(migration).toContain('CREATE POLICY "discount_applications_tenant_isolation"');
  });

  it('protects discount application history from mutation and deletion', () => {
    expect(migration).toContain('CREATE TRIGGER "discount_applications_no_update"');
    expect(migration).toContain('CREATE TRIGGER "discount_applications_no_delete"');
  });
});
