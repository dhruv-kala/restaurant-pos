CREATE TYPE "tax_rate_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "tax_group_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "tax_rule_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "tax_component" AS ENUM ('GST', 'CGST', 'SGST', 'IGST', 'VAT', 'SERVICE_TAX', 'CESS');
CREATE TYPE "tax_mapping_target" AS ENUM ('TENANT_DEFAULT', 'CATEGORY', 'ITEM');

CREATE TABLE "tax_rates" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "component" "tax_component" NOT NULL,
  "tax_type" "tax_type" NOT NULL,
  "rate_bps" INTEGER NOT NULL,
  "status" "tax_rate_status" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_rates_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_-]*$'),
  CONSTRAINT "tax_rates_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "tax_rates_rate_bps_check" CHECK ("rate_bps" >= 0 AND "rate_bps" <= 10000),
  CONSTRAINT "tax_rates_validity_check" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "tax_rates_version_check" CHECK ("version" > 0)
);

CREATE TABLE "tax_groups" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "status" "tax_group_status" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tax_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_groups_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_-]*$'),
  CONSTRAINT "tax_groups_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "tax_groups_validity_check" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "tax_groups_version_check" CHECK ("version" > 0)
);

CREATE TABLE "tax_group_rates" (
  "tenant_id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "rate_id" UUID NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tax_group_rates_pkey" PRIMARY KEY ("tenant_id", "group_id", "rate_id")
);

CREATE TABLE "tax_rules" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "tax_group_id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "priority" INTEGER NOT NULL DEFAULT 100,
  "status" "tax_rule_status" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_rules_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_-]*$'),
  CONSTRAINT "tax_rules_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "tax_rules_priority_check" CHECK ("priority" >= 0),
  CONSTRAINT "tax_rules_validity_check" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "tax_rules_version_check" CHECK ("version" > 0)
);

CREATE TABLE "tax_category_mappings" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "tax_rule_id" UUID NOT NULL,
  "target" "tax_mapping_target" NOT NULL,
  "menu_category_id" UUID,
  "menu_item_id" UUID,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tax_category_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_category_mappings_target_check" CHECK (
    ("target" = 'TENANT_DEFAULT' AND "menu_category_id" IS NULL AND "menu_item_id" IS NULL)
    OR ("target" = 'CATEGORY' AND "menu_category_id" IS NOT NULL AND "menu_item_id" IS NULL)
    OR ("target" = 'ITEM' AND "menu_item_id" IS NOT NULL AND "menu_category_id" IS NULL)
  ),
  CONSTRAINT "tax_category_mappings_validity_check" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "tax_category_mappings_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "tax_rates_tenant_id_id_key" ON "tax_rates"("tenant_id", "id");
CREATE UNIQUE INDEX "tax_rates_tenant_profile_code_key" ON "tax_rates"("tenant_id", "profile_id", "code");
CREATE INDEX "tax_rates_profile_status_idx" ON "tax_rates"("tenant_id", "profile_id", "status");
CREATE INDEX "tax_rates_component_status_idx" ON "tax_rates"("tenant_id", "component", "status");
CREATE INDEX "tax_rates_validity_idx" ON "tax_rates"("tenant_id", "effective_from", "effective_to");

CREATE UNIQUE INDEX "tax_groups_tenant_id_id_key" ON "tax_groups"("tenant_id", "id");
CREATE UNIQUE INDEX "tax_groups_tenant_profile_code_key" ON "tax_groups"("tenant_id", "profile_id", "code");
CREATE INDEX "tax_groups_profile_status_idx" ON "tax_groups"("tenant_id", "profile_id", "status");
CREATE INDEX "tax_groups_validity_idx" ON "tax_groups"("tenant_id", "effective_from", "effective_to");

CREATE INDEX "tax_group_rates_rate_idx" ON "tax_group_rates"("tenant_id", "rate_id");

CREATE UNIQUE INDEX "tax_rules_tenant_id_id_key" ON "tax_rules"("tenant_id", "id");
CREATE UNIQUE INDEX "tax_rules_tenant_profile_code_key" ON "tax_rules"("tenant_id", "profile_id", "code");
CREATE INDEX "tax_rules_profile_status_priority_idx" ON "tax_rules"("tenant_id", "profile_id", "status", "priority");
CREATE INDEX "tax_rules_group_idx" ON "tax_rules"("tenant_id", "tax_group_id");
CREATE INDEX "tax_rules_validity_idx" ON "tax_rules"("tenant_id", "effective_from", "effective_to");

CREATE UNIQUE INDEX "tax_category_mappings_tenant_id_id_key" ON "tax_category_mappings"("tenant_id", "id");
CREATE INDEX "tax_category_mappings_target_validity_idx" ON "tax_category_mappings"("tenant_id", "target", "is_active", "effective_from", "effective_to");
CREATE INDEX "tax_category_mappings_category_validity_idx" ON "tax_category_mappings"("tenant_id", "target", "menu_category_id", "effective_from", "effective_to");
CREATE INDEX "tax_category_mappings_item_validity_idx" ON "tax_category_mappings"("tenant_id", "target", "menu_item_id", "effective_from", "effective_to");
CREATE INDEX "tax_category_mappings_rule_active_idx" ON "tax_category_mappings"("tenant_id", "tax_rule_id", "is_active");

ALTER TABLE "tax_rates"
  ADD CONSTRAINT "tax_rates_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rates"
  ADD CONSTRAINT "tax_rates_profile_id_fkey"
  FOREIGN KEY ("tenant_id", "profile_id") REFERENCES "tax_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rates"
  ADD CONSTRAINT "tax_rates_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rates"
  ADD CONSTRAINT "tax_rates_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tax_groups"
  ADD CONSTRAINT "tax_groups_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_groups"
  ADD CONSTRAINT "tax_groups_profile_id_fkey"
  FOREIGN KEY ("tenant_id", "profile_id") REFERENCES "tax_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_groups"
  ADD CONSTRAINT "tax_groups_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_groups"
  ADD CONSTRAINT "tax_groups_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tax_group_rates"
  ADD CONSTRAINT "tax_group_rates_group_id_fkey"
  FOREIGN KEY ("tenant_id", "group_id") REFERENCES "tax_groups"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tax_group_rates"
  ADD CONSTRAINT "tax_group_rates_rate_id_fkey"
  FOREIGN KEY ("tenant_id", "rate_id") REFERENCES "tax_rates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tax_rules"
  ADD CONSTRAINT "tax_rules_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rules"
  ADD CONSTRAINT "tax_rules_profile_id_fkey"
  FOREIGN KEY ("tenant_id", "profile_id") REFERENCES "tax_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rules"
  ADD CONSTRAINT "tax_rules_tax_group_id_fkey"
  FOREIGN KEY ("tenant_id", "tax_group_id") REFERENCES "tax_groups"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rules"
  ADD CONSTRAINT "tax_rules_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_rules"
  ADD CONSTRAINT "tax_rules_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tax_category_mappings"
  ADD CONSTRAINT "tax_category_mappings_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_category_mappings"
  ADD CONSTRAINT "tax_category_mappings_tax_rule_id_fkey"
  FOREIGN KEY ("tenant_id", "tax_rule_id") REFERENCES "tax_rules"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_category_mappings"
  ADD CONSTRAINT "tax_category_mappings_menu_category_id_fkey"
  FOREIGN KEY ("tenant_id", "menu_category_id") REFERENCES "menu_categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_category_mappings"
  ADD CONSTRAINT "tax_category_mappings_menu_item_id_fkey"
  FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_category_mappings"
  ADD CONSTRAINT "tax_category_mappings_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_category_mappings"
  ADD CONSTRAINT "tax_category_mappings_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tax_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_rates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tax_rates_tenant_isolation" ON "tax_rates"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "tax_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_groups" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tax_groups_tenant_isolation" ON "tax_groups"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "tax_group_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_group_rates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tax_group_rates_tenant_isolation" ON "tax_group_rates"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "tax_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_rules" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tax_rules_tenant_isolation" ON "tax_rules"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "tax_category_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_category_mappings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tax_category_mappings_tenant_isolation" ON "tax_category_mappings"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());
