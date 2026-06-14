CREATE TYPE "fiscal_policy_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "fiscal_invoice_sequence_status" AS ENUM ('ACTIVE', 'CLOSED');

CREATE TABLE "outlet_fiscal_policies" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "tax_profile_id" UUID,
  "invoice_prefix" VARCHAR(24) NOT NULL,
  "invoice_padding" INTEGER NOT NULL DEFAULT 5,
  "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 4,
  "fiscal_year_start_day" INTEGER NOT NULL DEFAULT 1,
  "timezone" VARCHAR(64) NOT NULL,
  "status" "fiscal_policy_status" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "outlet_fiscal_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outlet_fiscal_policies_invoice_prefix_check" CHECK ("invoice_prefix" ~ '^[A-Z0-9][A-Z0-9_-]{0,23}$'),
  CONSTRAINT "outlet_fiscal_policies_invoice_padding_check" CHECK ("invoice_padding" >= 1 AND "invoice_padding" <= 12),
  CONSTRAINT "outlet_fiscal_policies_fiscal_month_check" CHECK ("fiscal_year_start_month" >= 1 AND "fiscal_year_start_month" <= 12),
  CONSTRAINT "outlet_fiscal_policies_fiscal_day_check" CHECK ("fiscal_year_start_day" >= 1 AND "fiscal_year_start_day" <= 31),
  CONSTRAINT "outlet_fiscal_policies_timezone_check" CHECK (length(btrim("timezone")) > 0),
  CONSTRAINT "outlet_fiscal_policies_validity_check" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "outlet_fiscal_policies_version_check" CHECK ("version" > 0)
);

CREATE TABLE "fiscal_invoice_sequences" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "fiscal_policy_id" UUID NOT NULL,
  "fiscal_year_label" VARCHAR(16) NOT NULL,
  "prefix" VARCHAR(24) NOT NULL,
  "padding" INTEGER NOT NULL DEFAULT 5,
  "last_number" INTEGER NOT NULL DEFAULT 0,
  "status" "fiscal_invoice_sequence_status" NOT NULL DEFAULT 'ACTIVE',
  "starts_at" DATE NOT NULL,
  "ends_at" DATE NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "fiscal_invoice_sequences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fiscal_invoice_sequences_year_label_check" CHECK ("fiscal_year_label" ~ '^[0-9]{4}(-[0-9]{2,4})?$'),
  CONSTRAINT "fiscal_invoice_sequences_prefix_check" CHECK ("prefix" ~ '^[A-Z0-9][A-Z0-9_-]{0,23}$'),
  CONSTRAINT "fiscal_invoice_sequences_padding_check" CHECK ("padding" >= 1 AND "padding" <= 12),
  CONSTRAINT "fiscal_invoice_sequences_last_number_check" CHECK ("last_number" >= 0),
  CONSTRAINT "fiscal_invoice_sequences_dates_check" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "fiscal_invoice_sequences_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "outlet_fiscal_policies_tenant_id_id_key"
  ON "outlet_fiscal_policies"("tenant_id", "id");
CREATE INDEX "outlet_fiscal_policies_outlet_validity_idx"
  ON "outlet_fiscal_policies"("tenant_id", "outlet_id", "status", "effective_from", "effective_to");
CREATE INDEX "outlet_fiscal_policies_tax_profile_idx"
  ON "outlet_fiscal_policies"("tenant_id", "tax_profile_id");

CREATE UNIQUE INDEX "fiscal_invoice_sequences_tenant_id_id_key"
  ON "fiscal_invoice_sequences"("tenant_id", "id");
CREATE UNIQUE INDEX "fiscal_invoice_sequences_outlet_year_prefix_key"
  ON "fiscal_invoice_sequences"("tenant_id", "outlet_id", "fiscal_year_label", "prefix");
CREATE INDEX "fiscal_invoice_sequences_outlet_validity_idx"
  ON "fiscal_invoice_sequences"("tenant_id", "outlet_id", "status", "starts_at", "ends_at");
CREATE INDEX "fiscal_invoice_sequences_policy_status_idx"
  ON "fiscal_invoice_sequences"("tenant_id", "fiscal_policy_id", "status");

ALTER TABLE "outlet_fiscal_policies"
  ADD CONSTRAINT "outlet_fiscal_policies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outlet_fiscal_policies"
  ADD CONSTRAINT "outlet_fiscal_policies_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outlet_fiscal_policies"
  ADD CONSTRAINT "outlet_fiscal_policies_tax_profile_id_fkey"
  FOREIGN KEY ("tenant_id", "tax_profile_id") REFERENCES "tax_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outlet_fiscal_policies"
  ADD CONSTRAINT "outlet_fiscal_policies_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outlet_fiscal_policies"
  ADD CONSTRAINT "outlet_fiscal_policies_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fiscal_invoice_sequences"
  ADD CONSTRAINT "fiscal_invoice_sequences_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_invoice_sequences"
  ADD CONSTRAINT "fiscal_invoice_sequences_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_invoice_sequences"
  ADD CONSTRAINT "fiscal_invoice_sequences_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "fiscal_policy_id") REFERENCES "outlet_fiscal_policies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_invoice_sequences"
  ADD CONSTRAINT "fiscal_invoice_sequences_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_invoice_sequences"
  ADD CONSTRAINT "fiscal_invoice_sequences_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "outlet_fiscal_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outlet_fiscal_policies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outlet_fiscal_policies_tenant_isolation" ON "outlet_fiscal_policies"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "fiscal_invoice_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fiscal_invoice_sequences" FORCE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_invoice_sequences_tenant_isolation" ON "fiscal_invoice_sequences"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());
