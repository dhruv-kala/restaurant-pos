CREATE TYPE "report_export_format" AS ENUM ('PDF', 'EXCEL', 'CSV');

ALTER TABLE "orders" ADD COLUMN "business_date" DATE;
UPDATE "orders" AS records
SET "business_date" = (records."created_at" AT TIME ZONE outlets."timezone")::date
FROM "outlets"
WHERE outlets."tenant_id" = records."tenant_id"
  AND outlets."id" = records."outlet_id";
ALTER TABLE "orders" ALTER COLUMN "business_date" SET NOT NULL;

ALTER TABLE "bills" ADD COLUMN "business_date" DATE;
UPDATE "bills" AS records
SET "business_date" = (records."generated_at" AT TIME ZONE outlets."timezone")::date
FROM "outlets"
WHERE outlets."tenant_id" = records."tenant_id"
  AND outlets."id" = records."outlet_id";
ALTER TABLE "bills" ALTER COLUMN "business_date" SET NOT NULL;

ALTER TABLE "inventory_consumptions" ADD COLUMN "business_date" DATE;
UPDATE "inventory_consumptions" AS records
SET "business_date" = orders."business_date"
FROM "orders"
WHERE orders."tenant_id" = records."tenant_id"
  AND orders."id" = records."order_id";
ALTER TABLE "inventory_consumptions" ALTER COLUMN "business_date" SET NOT NULL;

ALTER TABLE "inventory_wastages" ADD COLUMN "business_date" DATE;
UPDATE "inventory_wastages" AS records
SET "business_date" = (records."recorded_at" AT TIME ZONE outlets."timezone")::date
FROM "outlets"
WHERE outlets."tenant_id" = records."tenant_id"
  AND outlets."id" = records."outlet_id";
ALTER TABLE "inventory_wastages" ALTER COLUMN "business_date" SET NOT NULL;

ALTER TABLE "customer_visits" ADD COLUMN "business_date" DATE;
UPDATE "customer_visits" AS records
SET "business_date" = payments."business_date"
FROM "payments"
WHERE payments."tenant_id" = records."tenant_id"
  AND payments."id" = records."payment_id";
UPDATE "customer_visits" AS records
SET "business_date" = (records."visit_date" AT TIME ZONE outlets."timezone")::date
FROM "outlets"
WHERE outlets."tenant_id" = records."tenant_id"
  AND outlets."id" = records."outlet_id"
  AND records."business_date" IS NULL;
ALTER TABLE "customer_visits" ALTER COLUMN "business_date" SET NOT NULL;

CREATE TABLE "report_generation_audits" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID,
  "outlet_id" UUID,
  "report_type" VARCHAR(100) NOT NULL,
  "export_format" "report_export_format",
  "filters" JSONB NOT NULL,
  "generated_by_user_id" UUID NOT NULL,
  "generated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_generation_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "report_generation_audits_scope_check" CHECK (
    "outlet_id" IS NULL OR "tenant_id" IS NOT NULL
  )
);

DROP INDEX IF EXISTS "orders_tenant_id_outlet_id_status_created_at_idx";
DROP INDEX IF EXISTS "bills_tenant_id_outlet_id_status_generated_at_idx";
DROP INDEX IF EXISTS "inventory_consumptions_tenant_id_outlet_id_consumed_at_idx";
DROP INDEX IF EXISTS "inventory_wastages_tenant_id_outlet_id_ingredient_id_recorded_at_idx";
DROP INDEX IF EXISTS "customer_visits_tenant_id_customer_id_visit_date_idx";
DROP INDEX IF EXISTS "customer_visits_tenant_id_outlet_id_visit_date_idx";

CREATE INDEX "orders_reporting_idx"
  ON "orders"("tenant_id", "business_date", "outlet_id", "status");
CREATE INDEX "bills_reporting_idx"
  ON "bills"("tenant_id", "business_date", "outlet_id", "status");
CREATE INDEX "payments_reporting_idx"
  ON "payments"("tenant_id", "business_date", "outlet_id", "status");
CREATE INDEX "inventory_consumptions_reporting_idx"
  ON "inventory_consumptions"("tenant_id", "business_date", "outlet_id");
CREATE INDEX "inventory_wastages_reporting_idx"
  ON "inventory_wastages"("tenant_id", "business_date", "outlet_id", "ingredient_id");
CREATE INDEX "customer_visits_customer_reporting_idx"
  ON "customer_visits"("tenant_id", "business_date", "customer_id");
CREATE INDEX "customer_visits_outlet_reporting_idx"
  ON "customer_visits"("tenant_id", "business_date", "outlet_id");
CREATE UNIQUE INDEX "report_generation_audits_tenant_id_id_key"
  ON "report_generation_audits"("tenant_id", "id");
CREATE INDEX "report_generation_audits_tenant_generated_idx"
  ON "report_generation_audits"("tenant_id", "generated_at");
CREATE INDEX "report_generation_audits_catalog_idx"
  ON "report_generation_audits"("tenant_id", "outlet_id", "report_type", "generated_at");

ALTER TABLE "report_generation_audits"
  ADD CONSTRAINT "report_generation_audits_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "report_generation_audits_outlet_fkey"
    FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "report_generation_audits_generated_by_fkey"
    FOREIGN KEY ("generated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "report_generation_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_generation_audits" FORCE ROW LEVEL SECURITY;
CREATE POLICY "report_generation_audits_tenant_isolation"
  ON "report_generation_audits"
  USING (
    current_setting('app.is_platform_admin', true) = 'true'
    OR (
      "tenant_id" IS NOT NULL
      AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
  )
  WITH CHECK (
    current_setting('app.is_platform_admin', true) = 'true'
    OR (
      "tenant_id" IS NOT NULL
      AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
  );
