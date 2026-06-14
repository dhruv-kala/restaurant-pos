CREATE TABLE "tax_calculation_snapshots" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "order_id" UUID,
  "bill_id" UUID,
  "tax_profile_id" UUID,
  "outlet_fiscal_policy_id" UUID,
  "currency_code" CHAR(3) NOT NULL,
  "business_date" DATE NOT NULL,
  "calculated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tax_mode" "tax_mode" NOT NULL,
  "subtotal_amount_minor" INTEGER NOT NULL,
  "discount_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "taxable_amount_minor" INTEGER NOT NULL,
  "tax_amount_minor" INTEGER NOT NULL,
  "total_amount_minor" INTEGER NOT NULL,
  "calculation_input" JSONB NOT NULL,
  "breakdown" JSONB NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tax_calculation_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_calculation_snapshots_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "tax_calculation_snapshots_link_check" CHECK ("order_id" IS NOT NULL OR "bill_id" IS NOT NULL),
  CONSTRAINT "tax_calculation_snapshots_amounts_check" CHECK (
    "subtotal_amount_minor" >= 0
    AND "discount_amount_minor" >= 0
    AND "taxable_amount_minor" >= 0
    AND "tax_amount_minor" >= 0
    AND "total_amount_minor" >= 0
  )
);

CREATE UNIQUE INDEX "tax_calculation_snapshots_tenant_id_id_key"
  ON "tax_calculation_snapshots"("tenant_id", "id");
CREATE INDEX "tax_calculation_snapshots_reporting_idx"
  ON "tax_calculation_snapshots"("tenant_id", "outlet_id", "business_date");
CREATE INDEX "tax_calculation_snapshots_bill_idx"
  ON "tax_calculation_snapshots"("tenant_id", "bill_id");
CREATE INDEX "tax_calculation_snapshots_order_idx"
  ON "tax_calculation_snapshots"("tenant_id", "order_id");
CREATE INDEX "tax_calculation_snapshots_profile_idx"
  ON "tax_calculation_snapshots"("tenant_id", "tax_profile_id");

ALTER TABLE "tax_calculation_snapshots"
  ADD CONSTRAINT "tax_calculation_snapshots_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculation_snapshots"
  ADD CONSTRAINT "tax_calculation_snapshots_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculation_snapshots"
  ADD CONSTRAINT "tax_calculation_snapshots_order_id_fkey"
  FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculation_snapshots"
  ADD CONSTRAINT "tax_calculation_snapshots_bill_id_fkey"
  FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bills"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculation_snapshots"
  ADD CONSTRAINT "tax_calculation_snapshots_tax_profile_id_fkey"
  FOREIGN KEY ("tenant_id", "tax_profile_id") REFERENCES "tax_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculation_snapshots"
  ADD CONSTRAINT "tax_calculation_snapshots_outlet_fiscal_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_fiscal_policy_id") REFERENCES "outlet_fiscal_policies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_calculation_snapshots"
  ADD CONSTRAINT "tax_calculation_snapshots_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tax_calculation_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_calculation_snapshots" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tax_calculation_snapshots_tenant_isolation" ON "tax_calculation_snapshots"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_tax_calculation_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'tax calculation snapshots are append-only';
END;
$$;

CREATE TRIGGER "tax_calculation_snapshots_reject_update"
  BEFORE UPDATE ON "tax_calculation_snapshots"
  FOR EACH ROW EXECUTE FUNCTION reject_tax_calculation_snapshot_mutation();

CREATE TRIGGER "tax_calculation_snapshots_reject_delete"
  BEFORE DELETE ON "tax_calculation_snapshots"
  FOR EACH ROW EXECUTE FUNCTION reject_tax_calculation_snapshot_mutation();
