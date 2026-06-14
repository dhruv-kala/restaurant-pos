CREATE TYPE "promotion_campaign_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "promotion_campaign_outlet_scope" AS ENUM ('ALL_OUTLETS', 'SELECTED_OUTLETS');
CREATE TYPE "promotion_rule_type" AS ENUM (
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'FREE_ITEM',
  'CATEGORY',
  'ITEM'
);

CREATE TABLE "promotion_campaigns" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "status" "promotion_campaign_status" NOT NULL DEFAULT 'DRAFT',
  "outlet_scope" "promotion_campaign_outlet_scope" NOT NULL DEFAULT 'ALL_OUTLETS',
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3) NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "metadata" JSONB,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "promotion_campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotion_campaigns_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_-]*$'),
  CONSTRAINT "promotion_campaigns_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "promotion_campaigns_period_check" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "promotion_campaigns_priority_check" CHECK ("priority" >= 0),
  CONSTRAINT "promotion_campaigns_version_check" CHECK ("version" > 0)
);

CREATE TABLE "promotion_campaign_outlets" (
  "tenant_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "promotion_campaign_outlets_pkey" PRIMARY KEY ("tenant_id", "campaign_id", "outlet_id")
);

CREATE TABLE "promotion_rules" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "rule_type" "promotion_rule_type" NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "discount_policy_id" UUID,
  "value_type" "discount_value_type",
  "percentage_bps" INTEGER,
  "amount_minor" INTEGER,
  "currency_code" CHAR(3),
  "max_discount_minor" INTEGER,
  "minimum_subtotal_minor" INTEGER,
  "target_menu_category_id" UUID,
  "target_menu_item_id" UUID,
  "free_item_menu_item_id" UUID,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "promotion_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotion_rules_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "promotion_rules_priority_check" CHECK ("priority" >= 0),
  CONSTRAINT "promotion_rules_minimum_subtotal_check" CHECK (
    "minimum_subtotal_minor" IS NULL OR "minimum_subtotal_minor" >= 0
  ),
  CONSTRAINT "promotion_rules_max_discount_check" CHECK (
    "max_discount_minor" IS NULL OR "max_discount_minor" >= 0
  ),
  CONSTRAINT "promotion_rules_value_check" CHECK (
    ("rule_type" = 'PERCENTAGE'
      AND "value_type" = 'PERCENTAGE'
      AND "percentage_bps" IS NOT NULL
      AND "percentage_bps" > 0
      AND "percentage_bps" <= 10000
      AND "amount_minor" IS NULL
      AND "currency_code" IS NULL
      AND "free_item_menu_item_id" IS NULL)
    OR
    ("rule_type" = 'FIXED_AMOUNT'
      AND "value_type" = 'FIXED_AMOUNT'
      AND "amount_minor" IS NOT NULL
      AND "amount_minor" > 0
      AND "currency_code" IS NOT NULL
      AND "percentage_bps" IS NULL
      AND "free_item_menu_item_id" IS NULL)
    OR
    ("rule_type" = 'CATEGORY'
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
    ("rule_type" = 'ITEM'
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
    ("rule_type" = 'FREE_ITEM'
      AND "free_item_menu_item_id" IS NOT NULL
      AND "value_type" IS NULL
      AND "percentage_bps" IS NULL
      AND "amount_minor" IS NULL
      AND "currency_code" IS NULL
      AND "max_discount_minor" IS NULL)
  )
);

CREATE UNIQUE INDEX "promotion_campaigns_tenant_id_id_key"
  ON "promotion_campaigns"("tenant_id", "id");
CREATE UNIQUE INDEX "promotion_campaigns_tenant_id_code_key"
  ON "promotion_campaigns"("tenant_id", "code");
CREATE INDEX "promotion_campaigns_validity_idx"
  ON "promotion_campaigns"("tenant_id", "status", "starts_at", "ends_at");
CREATE INDEX "promotion_campaigns_scope_status_idx"
  ON "promotion_campaigns"("tenant_id", "outlet_scope", "status");

CREATE INDEX "promotion_campaign_outlets_outlet_idx"
  ON "promotion_campaign_outlets"("tenant_id", "outlet_id");

CREATE UNIQUE INDEX "promotion_rules_tenant_id_id_key"
  ON "promotion_rules"("tenant_id", "id");
CREATE INDEX "promotion_rules_campaign_idx"
  ON "promotion_rules"("tenant_id", "campaign_id", "is_active", "priority");
CREATE INDEX "promotion_rules_type_active_idx"
  ON "promotion_rules"("tenant_id", "rule_type", "is_active");

ALTER TABLE "promotion_campaigns"
  ADD CONSTRAINT "promotion_campaigns_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_campaigns"
  ADD CONSTRAINT "promotion_campaigns_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_campaigns"
  ADD CONSTRAINT "promotion_campaigns_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promotion_campaign_outlets"
  ADD CONSTRAINT "promotion_campaign_outlets_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_campaign_outlets"
  ADD CONSTRAINT "promotion_campaign_outlets_tenant_id_campaign_id_fkey"
  FOREIGN KEY ("tenant_id", "campaign_id") REFERENCES "promotion_campaigns"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_campaign_outlets"
  ADD CONSTRAINT "promotion_campaign_outlets_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promotion_rules"
  ADD CONSTRAINT "promotion_rules_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_rules"
  ADD CONSTRAINT "promotion_rules_tenant_id_campaign_id_fkey"
  FOREIGN KEY ("tenant_id", "campaign_id") REFERENCES "promotion_campaigns"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_rules"
  ADD CONSTRAINT "promotion_rules_tenant_id_discount_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "discount_policy_id") REFERENCES "discount_policies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_rules"
  ADD CONSTRAINT "promotion_rules_tenant_id_target_menu_category_id_fkey"
  FOREIGN KEY ("tenant_id", "target_menu_category_id") REFERENCES "menu_categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_rules"
  ADD CONSTRAINT "promotion_rules_tenant_id_target_menu_item_id_fkey"
  FOREIGN KEY ("tenant_id", "target_menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_rules"
  ADD CONSTRAINT "promotion_rules_tenant_id_free_item_menu_item_id_fkey"
  FOREIGN KEY ("tenant_id", "free_item_menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promotion_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotion_campaigns" FORCE ROW LEVEL SECURITY;
CREATE POLICY "promotion_campaigns_tenant_isolation" ON "promotion_campaigns"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "promotion_campaign_outlets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotion_campaign_outlets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "promotion_campaign_outlets_tenant_isolation" ON "promotion_campaign_outlets"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "promotion_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotion_rules" FORCE ROW LEVEL SECURITY;
CREATE POLICY "promotion_rules_tenant_isolation" ON "promotion_rules"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());
