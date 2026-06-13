import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('subscription plan schema', () => {
  const root = join(__dirname, '../../../');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(root, 'prisma/migrations/20260614220000_add_subscription_plan_management/migration.sql'),
    'utf8',
  );

  it('defines versioned platform plan and feature records', () => {
    expect(schema).toContain('model SubscriptionPlan {');
    expect(schema).toContain('model SubscriptionPlanFeature {');
    expect(schema).toContain('versionNumber');
    expect(schema).toContain('@@unique([code, versionNumber]');
    expect(migration).toContain('subscription_plans_one_active_code_key');
  });

  it('enforces valid commercial values and immutable activated versions', () => {
    expect(migration).toContain('subscription_plans_price_check');
    expect(migration).toContain('subscription_plans_currency_check');
    expect(migration).toContain('subscription_plans_activation_check');
    expect(migration).toContain('subscription_plans_activated_immutable');
    expect(migration).toContain('subscription_plan_features_activated_immutable');
  });

  it('uses restrictive references so future subscriptions can retain plan versions', () => {
    expect(migration).toContain('subscription_plan_features_plan_id_fkey');
    expect(migration).toContain('ON DELETE RESTRICT');
  });
});
