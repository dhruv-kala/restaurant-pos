CREATE TYPE "coupon_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "coupon_type" AS ENUM (
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'FREE_ITEM',
  'CATEGORY',
  'ITEM'
);

CREATE TABLE "coupons" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "coupon_type" "coupon_type" NOT NULL,
  "status" "coupon_status" NOT NULL DEFAULT 'ACTIVE',
  "discount_policy_id" UUID,
  "value_type" "discount_value_type",
  "percentage_bps" INTEGER,
  "amount_minor" INTEGER,
  "currency_code" CHAR(3),
  "max_discount_minor" INTEGER,
  "target_menu_category_id" UUID,
  "target_menu_item_id" UUID,
  "free_item_menu_item_id" UUID,
  "starts_at" TIMESTAMPTZ(3),
  "ends_at" TIMESTAMPTZ(3),
  "total_usage_limit" INTEGER,
  "per_customer_usage_limit" INTEGER,
  "current_usage_count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coupons_code_check" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{2,63}$'),
  CONSTRAINT "coupons_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "coupons_version_check" CHECK ("version" > 0),
  CONSTRAINT "coupons_usage_limit_check" CHECK (
    ("total_usage_limit" IS NULL OR "total_usage_limit" > 0)
    AND ("per_customer_usage_limit" IS NULL OR "per_customer_usage_limit" > 0)
    AND "current_usage_count" >= 0
    AND ("total_usage_limit" IS NULL OR "current_usage_count" <= "total_usage_limit")
  ),
  CONSTRAINT "coupons_validity_check" CHECK (
    "starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" > "starts_at"
  ),
  CONSTRAINT "coupons_value_check" CHECK (
    ("coupon_type" = 'PERCENTAGE'
      AND "value_type" = 'PERCENTAGE'
      AND "percentage_bps" IS NOT NULL
      AND "percentage_bps" > 0
      AND "percentage_bps" <= 10000
      AND "amount_minor" IS NULL
      AND "currency_code" IS NULL
      AND "free_item_menu_item_id" IS NULL)
    OR
    ("coupon_type" = 'FIXED_AMOUNT'
      AND "value_type" = 'FIXED_AMOUNT'
      AND "amount_minor" IS NOT NULL
      AND "amount_minor" > 0
      AND "currency_code" IS NOT NULL
      AND "percentage_bps" IS NULL
      AND "free_item_menu_item_id" IS NULL)
    OR
    ("coupon_type" = 'CATEGORY'
      AND "target_menu_category_id" IS NOT NULL
      AND "free_item_menu_item_id" IS NULL
      AND (
        ("value_type" = 'PERCENTAGE'
          AND "percentage_bps" IS NOT NULL
          AND "percentage_bps" > 0
          AND "percentage_bps" <= 10000
          AND "amount_minor" IS NULL
          AND "currency_code" IS NULL)
        OR
        ("value_type" = 'FIXED_AMOUNT'
          AND "amount_minor" IS NOT NULL
          AND "amount_minor" > 0
          AND "currency_code" IS NOT NULL
          AND "percentage_bps" IS NULL)
      ))
    OR
    ("coupon_type" = 'ITEM'
      AND "target_menu_item_id" IS NOT NULL
      AND "free_item_menu_item_id" IS NULL
      AND (
        ("value_type" = 'PERCENTAGE'
          AND "percentage_bps" IS NOT NULL
          AND "percentage_bps" > 0
          AND "percentage_bps" <= 10000
          AND "amount_minor" IS NULL
          AND "currency_code" IS NULL)
        OR
        ("value_type" = 'FIXED_AMOUNT'
          AND "amount_minor" IS NOT NULL
          AND "amount_minor" > 0
          AND "currency_code" IS NOT NULL
          AND "percentage_bps" IS NULL)
      ))
    OR
    ("coupon_type" = 'FREE_ITEM'
      AND "free_item_menu_item_id" IS NOT NULL
      AND "value_type" IS NULL
      AND "percentage_bps" IS NULL
      AND "amount_minor" IS NULL
      AND "currency_code" IS NULL
      AND "max_discount_minor" IS NULL)
  ),
  CONSTRAINT "coupons_max_discount_check" CHECK (
    "max_discount_minor" IS NULL OR "max_discount_minor" >= 0
  )
);

CREATE UNIQUE INDEX "coupons_tenant_id_id_key"
  ON "coupons"("tenant_id", "id");
CREATE UNIQUE INDEX "coupons_tenant_id_code_key"
  ON "coupons"("tenant_id", "code");
CREATE INDEX "coupons_outlet_status_idx"
  ON "coupons"("tenant_id", "outlet_id", "status");
CREATE INDEX "coupons_validity_idx"
  ON "coupons"("tenant_id", "status", "starts_at", "ends_at");
CREATE INDEX "coupons_type_status_idx"
  ON "coupons"("tenant_id", "coupon_type", "status");

ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_tenant_id_discount_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "discount_policy_id") REFERENCES "discount_policies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_tenant_id_target_menu_category_id_fkey"
  FOREIGN KEY ("tenant_id", "target_menu_category_id") REFERENCES "menu_categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_tenant_id_target_menu_item_id_fkey"
  FOREIGN KEY ("tenant_id", "target_menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_tenant_id_free_item_menu_item_id_fkey"
  FOREIGN KEY ("tenant_id", "free_item_menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupons" FORCE ROW LEVEL SECURITY;
CREATE POLICY "coupons_tenant_isolation" ON "coupons"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());
