import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('trial subscription schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260615140000_add_trial_management/migration.sql'),
    'utf8',
  );

  it('defines trial aggregate and immutable lifecycle events', () => {
    expect(schema).toContain('model TrialSubscription {');
    expect(schema).toContain('model TrialSubscriptionEvent {');
    expect(schema).toContain('enum TrialSubscriptionStatus {');
    expect(schema).toContain('enum TrialSubscriptionEventType {');
    expect(migration).toContain('trial_subscription_events_no_update');
    expect(migration).toContain('trial_subscription_events_no_delete');
  });

  it('enforces one tenant trial and one active trial', () => {
    expect(migration).toContain('trial_subscriptions_one_per_tenant_key');
    expect(migration).toContain('trial_subscriptions_one_active_key');
    expect(migration).toContain("WHERE \"status\" = 'ACTIVE'");
  });

  it('forces tenant isolation and retained trial records', () => {
    for (const table of ['trial_subscriptions', 'trial_subscription_events']) {
      expect(migration).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      expect(migration).toContain(`CREATE POLICY "${table}_tenant_isolation"`);
    }
    expect(migration).toContain('trial_subscriptions_no_delete');
    expect(migration).toContain('trial subscriptions cannot be deleted');
  });
});
