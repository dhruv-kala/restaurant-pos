CREATE TYPE "promotion_redemption_source" AS ENUM (
  'COUPON',
  'CAMPAIGN_RULE',
  'DISCOUNT_POLICY'
);

CREATE TABLE "promotion_redemptions" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "bill_id" UUID NOT NULL,
  "order_id" UUID,
  "customer_id" UUID,
  "source" "promotion_redemption_source" NOT NULL,
  "coupon_id" UUID,
  "campaign_id" UUID,
  "promotion_rule_id" UUID,
  "discount_policy_id" UUID,
  "source_code_snapshot" VARCHAR(80),
  "source_name_snapshot" VARCHAR(160) NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "base_amount_minor" INTEGER NOT NULL,
  "discount_amount_minor" INTEGER NOT NULL,
  "final_amount_minor" INTEGER NOT NULL,
  "calculation_snapshot" JSONB NOT NULL,
  "eligibility_snapshot" JSONB NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "metadata" JSONB,
  "redeemed_by_user_id" UUID NOT NULL,
  "redeemed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "promotion_redemptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotion_redemptions_source_name_check" CHECK (length(btrim("source_name_snapshot")) > 0),
  CONSTRAINT "promotion_redemptions_currency_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "promotion_redemptions_amount_check" CHECK (
    "base_amount_minor" >= 0
    AND "discount_amount_minor" >= 0
    AND "final_amount_minor" >= 0
    AND "discount_amount_minor" <= "base_amount_minor"
    AND "final_amount_minor" = "base_amount_minor" - "discount_amount_minor"
  ),
  CONSTRAINT "promotion_redemptions_source_check" CHECK (
    ("source" = 'COUPON'
      AND "coupon_id" IS NOT NULL
      AND "campaign_id" IS NULL
      AND "promotion_rule_id" IS NULL
      AND "discount_policy_id" IS NULL)
    OR
    ("source" = 'CAMPAIGN_RULE'
      AND "coupon_id" IS NULL
      AND "campaign_id" IS NOT NULL
      AND "promotion_rule_id" IS NOT NULL
      AND "discount_policy_id" IS NULL)
    OR
    ("source" = 'DISCOUNT_POLICY'
      AND "coupon_id" IS NULL
      AND "campaign_id" IS NULL
      AND "promotion_rule_id" IS NULL
      AND "discount_policy_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "promotion_redemptions_tenant_id_id_key"
  ON "promotion_redemptions"("tenant_id", "id");
CREATE UNIQUE INDEX "promotion_redemptions_tenant_id_idempotency_key_key"
  ON "promotion_redemptions"("tenant_id", "idempotency_key");
CREATE INDEX "promotion_redemptions_outlet_redeemed_idx"
  ON "promotion_redemptions"("tenant_id", "outlet_id", "redeemed_at");
CREATE INDEX "promotion_redemptions_bill_idx"
  ON "promotion_redemptions"("tenant_id", "bill_id");
CREATE INDEX "promotion_redemptions_order_idx"
  ON "promotion_redemptions"("tenant_id", "order_id");
CREATE INDEX "promotion_redemptions_customer_coupon_idx"
  ON "promotion_redemptions"("tenant_id", "customer_id", "coupon_id");
CREATE INDEX "promotion_redemptions_coupon_redeemed_idx"
  ON "promotion_redemptions"("tenant_id", "coupon_id", "redeemed_at");
CREATE INDEX "promotion_redemptions_campaign_rule_idx"
  ON "promotion_redemptions"("tenant_id", "campaign_id", "promotion_rule_id");

ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_bill_id_fkey"
  FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bills"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_order_id_fkey"
  FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_coupon_id_fkey"
  FOREIGN KEY ("tenant_id", "coupon_id") REFERENCES "coupons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_campaign_id_fkey"
  FOREIGN KEY ("tenant_id", "campaign_id") REFERENCES "promotion_campaigns"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_promotion_rule_id_fkey"
  FOREIGN KEY ("tenant_id", "promotion_rule_id") REFERENCES "promotion_rules"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_tenant_id_discount_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "discount_policy_id") REFERENCES "discount_policies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_redemptions"
  ADD CONSTRAINT "promotion_redemptions_redeemed_by_user_id_fkey"
  FOREIGN KEY ("redeemed_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promotion_redemptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotion_redemptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "promotion_redemptions_tenant_isolation" ON "promotion_redemptions"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_promotion_redemption_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'promotion redemptions are append-only';
END;
$$;

CREATE TRIGGER "promotion_redemptions_no_update"
BEFORE UPDATE ON "promotion_redemptions"
FOR EACH ROW EXECUTE FUNCTION reject_promotion_redemption_mutation();

CREATE TRIGGER "promotion_redemptions_no_delete"
BEFORE DELETE ON "promotion_redemptions"
FOR EACH ROW EXECUTE FUNCTION reject_promotion_redemption_mutation();
