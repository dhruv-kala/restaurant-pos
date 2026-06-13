import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('subscription usage limit schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260615100000_add_usage_limits/migration.sql'),
    'utf8',
  );

  it('defines current counters and immutable idempotent operations', () => {
    expect(schema).toContain('model UsageCounter {');
    expect(schema).toContain('model UsageCounterEvent {');
    expect(schema).toContain('enum UsageCounterPeriod {');
    expect(schema).toContain('enum UsageLimitAction {');
    expect(migration).toContain('usage_counter_events_idempotency_key');
    expect(migration).toContain('usage_counter_events_no_update');
    expect(migration).toContain('usage_counter_events_no_delete');
  });

  it('enforces non-negative values, period identity, and retained counters', () => {
    expect(migration).toContain('usage_counters_value_check');
    expect(migration).toContain('usage_counters_period_check');
    expect(migration).toContain('usage_counters_tenant_feature_period_key');
    expect(migration).toContain('usage_counters_no_delete');
  });

  it('forces tenant isolation on counters and operation history', () => {
    for (const table of ['usage_counters', 'usage_counter_events']) {
      expect(migration).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      expect(migration).toContain(`CREATE POLICY "${table}_tenant_isolation"`);
    }
  });
});
