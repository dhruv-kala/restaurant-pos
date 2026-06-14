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
  const couponMigration = readFileSync(
    join(root, 'prisma/migrations/20260615200000_add_coupon_management/migration.sql'),
    'utf8',
  );
  const campaignMigration = readFileSync(
    join(root, 'prisma/migrations/20260615220000_add_promotion_campaigns/migration.sql'),
    'utf8',
  );
  const redemptionMigration = readFileSync(
    join(root, 'prisma/migrations/20260616000000_add_promotion_redemptions/migration.sql'),
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

  it('defines tenant-scoped coupons with forced row-level security', () => {
    expect(schema).toContain('model Coupon {');
    expect(schema).toContain('enum CouponStatus {');
    expect(schema).toContain('enum CouponType {');
    expect(couponMigration).toContain('CREATE TABLE "coupons"');
    expect(couponMigration).toContain('ALTER TABLE "coupons" FORCE ROW LEVEL SECURITY');
    expect(couponMigration).toContain('CREATE POLICY "coupons_tenant_isolation"');
  });

  it('defines promotion campaigns, outlet targets, and rules with forced RLS', () => {
    expect(schema).toContain('model PromotionCampaign {');
    expect(schema).toContain('model PromotionCampaignOutlet {');
    expect(schema).toContain('model PromotionRule {');
    expect(campaignMigration).toContain('CREATE TABLE "promotion_campaigns"');
    expect(campaignMigration).toContain('CREATE TABLE "promotion_campaign_outlets"');
    expect(campaignMigration).toContain('CREATE TABLE "promotion_rules"');
    expect(campaignMigration).toContain(
      'ALTER TABLE "promotion_campaigns" FORCE ROW LEVEL SECURITY',
    );
    expect(campaignMigration).toContain('ALTER TABLE "promotion_rules" FORCE ROW LEVEL SECURITY');
  });

  it('defines append-only promotion redemptions with forced RLS', () => {
    expect(schema).toContain('model PromotionRedemption {');
    expect(schema).toContain('enum PromotionRedemptionSource {');
    expect(redemptionMigration).toContain('CREATE TABLE "promotion_redemptions"');
    expect(redemptionMigration).toContain(
      'ALTER TABLE "promotion_redemptions" FORCE ROW LEVEL SECURITY',
    );
    expect(redemptionMigration).toContain('CREATE TRIGGER "promotion_redemptions_no_update"');
    expect(redemptionMigration).toContain('CREATE TRIGGER "promotion_redemptions_no_delete"');
  });
});
