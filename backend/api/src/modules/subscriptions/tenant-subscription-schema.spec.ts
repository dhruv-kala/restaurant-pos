import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('tenant subscription lifecycle schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260615020000_add_tenant_subscription_lifecycle/migration.sql'),
    'utf8',
  );

  it('defines tenant subscriptions and immutable lifecycle events', () => {
    expect(schema).toContain('model TenantSubscription {');
    expect(schema).toContain('model TenantSubscriptionEvent {');
    expect(schema).toContain('enum TenantSubscriptionStatus {');
    expect(schema).toContain('requestFingerprint');
    expect(migration).toContain('tenant_subscription_events_no_update');
    expect(migration).toContain('tenant_subscription_events_no_delete');
    expect(migration).toContain('tenant_subscriptions_no_delete');
  });

  it('enforces one current subscription and exact plan references', () => {
    expect(migration).toContain('tenant_subscriptions_one_current_key');
    expect(migration).toContain("WHERE \"status\" IN ('TRIAL', 'ACTIVE', 'SUSPENDED')");
    expect(migration).toContain('tenant_subscriptions_plan_id_fkey');
    expect(migration).toContain('tenant_subscription_events_new_plan_id_fkey');
    expect(migration).toContain('ON DELETE RESTRICT');
  });

  it('forces tenant isolation on aggregate and event history', () => {
    for (const table of ['tenant_subscriptions', 'tenant_subscription_events']) {
      expect(migration).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      expect(migration).toContain(`CREATE POLICY "${table}_tenant_isolation"`);
    }
  });
});
