CREATE TYPE "business_day_status" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "business_days" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "status" "business_day_status" NOT NULL DEFAULT 'OPEN',
  "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ(3),
  "opened_by_user_id" UUID NOT NULL,
  "closed_by_user_id" UUID,
  "opening_notes" VARCHAR(1000),
  "closing_notes" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "business_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_days_version_check" CHECK ("version" > 0),
  CONSTRAINT "business_days_closed_fields_check" CHECK (
    ("status" = 'OPEN' AND "closed_at" IS NULL AND "closed_by_user_id" IS NULL)
    OR
    ("status" = 'CLOSED' AND "closed_at" IS NOT NULL AND "closed_by_user_id" IS NOT NULL)
  ),
  CONSTRAINT "business_days_close_after_open_check" CHECK (
    "closed_at" IS NULL OR "closed_at" >= "opened_at"
  )
);

CREATE UNIQUE INDEX "business_days_tenant_id_id_key"
  ON "business_days"("tenant_id", "id");
CREATE UNIQUE INDEX "business_days_outlet_date_key"
  ON "business_days"("tenant_id", "outlet_id", "business_date");
CREATE UNIQUE INDEX "business_days_one_open_per_outlet_key"
  ON "business_days"("tenant_id", "outlet_id")
  WHERE "status" = 'OPEN';
CREATE INDEX "business_days_current_idx"
  ON "business_days"("tenant_id", "outlet_id", "status");
CREATE INDEX "business_days_reporting_idx"
  ON "business_days"("tenant_id", "business_date", "outlet_id", "status");

ALTER TABLE "business_days"
  ADD CONSTRAINT "business_days_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_days"
  ADD CONSTRAINT "business_days_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_days"
  ADD CONSTRAINT "business_days_opened_by_user_id_fkey"
  FOREIGN KEY ("opened_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_days"
  ADD CONSTRAINT "business_days_closed_by_user_id_fkey"
  FOREIGN KEY ("closed_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_days" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_days_tenant_isolation" ON "business_days"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_closed_business_day_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'business days cannot be deleted';
  END IF;
  IF OLD."status" = 'CLOSED' THEN
    RAISE EXCEPTION 'closed business days are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "business_days_no_closed_update"
BEFORE UPDATE ON "business_days"
FOR EACH ROW EXECUTE FUNCTION reject_closed_business_day_mutation();

CREATE TRIGGER "business_days_no_delete"
BEFORE DELETE ON "business_days"
FOR EACH ROW EXECUTE FUNCTION reject_closed_business_day_mutation();
