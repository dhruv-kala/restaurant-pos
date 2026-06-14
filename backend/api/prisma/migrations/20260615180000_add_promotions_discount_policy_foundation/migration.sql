CREATE TYPE "discount_policy_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "discount_scope" AS ENUM ('BILL', 'ITEM', 'CATEGORY');
CREATE TYPE "discount_value_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "discount_application_source" AS ENUM ('MANUAL', 'POLICY');

CREATE TABLE "discount_policies" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "scope" "discount_scope" NOT NULL,
  "value_type" "discount_value_type" NOT NULL,
  "percentage_bps" INTEGER,
  "amount_minor" INTEGER,
  "currency_code" CHAR(3),
  "max_discount_minor" INTEGER,
  "starts_at" TIMESTAMPTZ(3),
  "ends_at" TIMESTAMPTZ(3),
  "requires_manager_approval" BOOLEAN NOT NULL DEFAULT false,
  "status" "discount_policy_status" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "discount_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "discount_policies_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_-]*$'),
  CONSTRAINT "discount_policies_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "discount_policies_version_check" CHECK ("version" > 0),
  CONSTRAINT "discount_policies_percentage_check" CHECK (
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
  ),
  CONSTRAINT "discount_policies_max_discount_check" CHECK (
    "max_discount_minor" IS NULL OR "max_discount_minor" >= 0
  ),
  CONSTRAINT "discount_policies_validity_check" CHECK (
    "starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" > "starts_at"
  )
);

CREATE TABLE "discount_applications" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "policy_id" UUID,
  "bill_id" UUID,
  "order_id" UUID,
  "source" "discount_application_source" NOT NULL,
  "scope" "discount_scope" NOT NULL,
  "value_type" "discount_value_type" NOT NULL,
  "percentage_bps_snapshot" INTEGER,
  "amount_minor_snapshot" INTEGER,
  "currency_code" CHAR(3) NOT NULL,
  "base_amount_minor" INTEGER NOT NULL,
  "discount_amount_minor" INTEGER NOT NULL,
  "final_amount_minor" INTEGER NOT NULL,
  "policy_code_snapshot" VARCHAR(80),
  "policy_name_snapshot" VARCHAR(160),
  "reason" VARCHAR(500),
  "calculation_snapshot" JSONB NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "applied_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "discount_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "discount_applications_request_fingerprint_check" CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "discount_applications_amounts_check" CHECK (
    "base_amount_minor" >= 0
    AND "discount_amount_minor" >= 0
    AND "final_amount_minor" >= 0
    AND "discount_amount_minor" <= "base_amount_minor"
    AND "final_amount_minor" = "base_amount_minor" - "discount_amount_minor"
  ),
  CONSTRAINT "discount_applications_value_snapshot_check" CHECK (
    ("value_type" = 'PERCENTAGE'
      AND "percentage_bps_snapshot" IS NOT NULL
      AND "percentage_bps_snapshot" > 0
      AND "percentage_bps_snapshot" <= 10000
      AND "amount_minor_snapshot" IS NULL)
    OR
    ("value_type" = 'FIXED_AMOUNT'
      AND "amount_minor_snapshot" IS NOT NULL
      AND "amount_minor_snapshot" > 0
      AND "percentage_bps_snapshot" IS NULL)
  ),
  CONSTRAINT "discount_applications_policy_source_check" CHECK (
    ("source" = 'POLICY' AND "policy_id" IS NOT NULL)
    OR ("source" = 'MANUAL')
  )
);

CREATE UNIQUE INDEX "discount_policies_tenant_id_id_key"
  ON "discount_policies"("tenant_id", "id");
CREATE UNIQUE INDEX "discount_policies_tenant_id_code_key"
  ON "discount_policies"("tenant_id", "code");
CREATE INDEX "discount_policies_outlet_status_idx"
  ON "discount_policies"("tenant_id", "outlet_id", "status");
CREATE INDEX "discount_policies_validity_idx"
  ON "discount_policies"("tenant_id", "status", "starts_at", "ends_at");

CREATE UNIQUE INDEX "discount_applications_tenant_id_id_key"
  ON "discount_applications"("tenant_id", "id");
CREATE UNIQUE INDEX "discount_applications_tenant_id_idempotency_key_key"
  ON "discount_applications"("tenant_id", "idempotency_key");
CREATE INDEX "discount_applications_outlet_created_idx"
  ON "discount_applications"("tenant_id", "outlet_id", "created_at");
CREATE INDEX "discount_applications_bill_idx"
  ON "discount_applications"("tenant_id", "bill_id");
CREATE INDEX "discount_applications_order_idx"
  ON "discount_applications"("tenant_id", "order_id");
CREATE INDEX "discount_applications_policy_created_idx"
  ON "discount_applications"("tenant_id", "policy_id", "created_at");

ALTER TABLE "discount_policies"
  ADD CONSTRAINT "discount_policies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_policies"
  ADD CONSTRAINT "discount_policies_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_policies"
  ADD CONSTRAINT "discount_policies_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_policies"
  ADD CONSTRAINT "discount_policies_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "discount_applications"
  ADD CONSTRAINT "discount_applications_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_applications"
  ADD CONSTRAINT "discount_applications_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_applications"
  ADD CONSTRAINT "discount_applications_tenant_id_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "policy_id") REFERENCES "discount_policies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_applications"
  ADD CONSTRAINT "discount_applications_tenant_id_bill_id_fkey"
  FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bills"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_applications"
  ADD CONSTRAINT "discount_applications_tenant_id_order_id_fkey"
  FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_applications"
  ADD CONSTRAINT "discount_applications_applied_by_user_id_fkey"
  FOREIGN KEY ("applied_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "discount_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discount_policies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "discount_policies_tenant_isolation" ON "discount_policies"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "discount_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discount_applications" FORCE ROW LEVEL SECURITY;
CREATE POLICY "discount_applications_tenant_isolation" ON "discount_applications"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_discount_application_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'discount application snapshots are append-only';
END;
$$;

CREATE TRIGGER "discount_applications_no_update"
BEFORE UPDATE ON "discount_applications"
FOR EACH ROW EXECUTE FUNCTION reject_discount_application_mutation();

CREATE TRIGGER "discount_applications_no_delete"
BEFORE DELETE ON "discount_applications"
FOR EACH ROW EXECUTE FUNCTION reject_discount_application_mutation();
