CREATE TYPE "bill_status" AS ENUM ('DRAFT', 'GENERATED', 'PAID', 'VOID', 'REFUNDED');
CREATE TYPE "bill_source" AS ENUM ('POS', 'WAITER', 'QR', 'ONLINE', 'CUSTOMER_APP');

CREATE TABLE "bill_number_counters" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "bill_number_counters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bill_number_counters_last_number_check" CHECK ("last_number" > 0),
  CONSTRAINT "bill_number_counters_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "bill_number_counters_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "bill_number_counters_tenant_id_outlet_id_business_date_key"
  ON "bill_number_counters"("tenant_id", "outlet_id", "business_date");
CREATE INDEX "bill_number_counters_tenant_id_outlet_id_idx"
  ON "bill_number_counters"("tenant_id", "outlet_id");

CREATE TABLE "bills" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "bill_number" VARCHAR(32) NOT NULL,
  "invoice_number" VARCHAR(64),
  "status" "bill_status" NOT NULL DEFAULT 'GENERATED',
  "bill_source" "bill_source" NOT NULL DEFAULT 'POS',
  "currency_code" CHAR(3) NOT NULL,
  "customer_name" VARCHAR(160),
  "customer_phone" VARCHAR(20),
  "customer_gst_number" VARCHAR(32),
  "subtotal_minor" INTEGER NOT NULL DEFAULT 0,
  "discount_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "service_charge_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "round_off_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "grand_total_minor" INTEGER NOT NULL DEFAULT 0,
  "loyalty_points_earned" INTEGER NOT NULL DEFAULT 0,
  "loyalty_points_redeemed" INTEGER NOT NULL DEFAULT 0,
  "coupon_code" VARCHAR(64),
  "coupon_discount_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "notes" VARCHAR(1000),
  "source_bill_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "generated_by_user_id" UUID NOT NULL,
  "generated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "void_reason" VARCHAR(500),
  "voided_by_user_id" UUID,
  "voided_at" TIMESTAMPTZ(3),
  "print_count" INTEGER NOT NULL DEFAULT 0,
  "last_printed_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "bills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bills_money_check" CHECK (
    "subtotal_minor" >= 0 AND "discount_amount_minor" >= 0 AND
    "tax_amount_minor" >= 0 AND "service_charge_amount_minor" >= 0 AND
    "grand_total_minor" >= 0 AND "coupon_discount_amount_minor" >= 0
  ),
  CONSTRAINT "bills_loyalty_check" CHECK (
    "loyalty_points_earned" >= 0 AND "loyalty_points_redeemed" >= 0
  ),
  CONSTRAINT "bills_print_count_check" CHECK ("print_count" >= 0),
  CONSTRAINT "bills_total_formula_check" CHECK (
    "grand_total_minor" =
      "subtotal_minor" - "discount_amount_minor" -
      "coupon_discount_amount_minor" + "tax_amount_minor" +
      "service_charge_amount_minor" + "round_off_amount_minor"
  ),
  CONSTRAINT "bills_void_audit_check" CHECK (
    ("status" = 'VOID' AND "void_reason" IS NOT NULL AND "voided_at" IS NOT NULL AND "voided_by_user_id" IS NOT NULL) OR
    ("status" <> 'VOID')
  ),
  CONSTRAINT "bills_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "bills_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "bills_order_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "bills_generated_by_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "bills_voided_by_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "bills_tenant_id_id_key" ON "bills"("tenant_id", "id");
CREATE UNIQUE INDEX "bills_tenant_id_outlet_id_bill_number_key"
  ON "bills"("tenant_id", "outlet_id", "bill_number");
CREATE UNIQUE INDEX "bills_tenant_id_outlet_id_invoice_number_key"
  ON "bills"("tenant_id", "outlet_id", "invoice_number");
CREATE INDEX "bills_tenant_id_outlet_id_status_generated_at_idx"
  ON "bills"("tenant_id", "outlet_id", "status", "generated_at");
CREATE INDEX "bills_tenant_id_order_id_status_idx"
  ON "bills"("tenant_id", "order_id", "status");

CREATE TABLE "bill_items" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "bill_id" UUID NOT NULL,
  "order_item_id" UUID NOT NULL,
  "menu_item_id" UUID NOT NULL,
  "kitchen_category_id" UUID,
  "name" VARCHAR(160) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_minor" INTEGER NOT NULL,
  "discount_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "line_total_minor" INTEGER NOT NULL,
  "preparation_time_minutes" INTEGER,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bill_items_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "bill_items_money_check" CHECK (
    "unit_price_minor" >= 0 AND "discount_amount_minor" >= 0 AND
    "tax_amount_minor" >= 0 AND "line_total_minor" >= 0
  ),
  CONSTRAINT "bill_items_tax_rate_check" CHECK ("tax_percentage" >= 0 AND "tax_percentage" <= 100),
  CONSTRAINT "bill_items_prep_time_check" CHECK ("preparation_time_minutes" IS NULL OR "preparation_time_minutes" >= 0),
  CONSTRAINT "bill_items_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "bill_items_bill_fkey" FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bills"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "bill_items_order_item_fkey" FOREIGN KEY ("tenant_id", "order_item_id") REFERENCES "order_items"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "bill_items_kitchen_category_fkey" FOREIGN KEY ("tenant_id", "kitchen_category_id") REFERENCES "kitchen_categories"("tenant_id", "id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "bill_items_tenant_id_id_key" ON "bill_items"("tenant_id", "id");
CREATE INDEX "bill_items_tenant_id_bill_id_idx" ON "bill_items"("tenant_id", "bill_id");
CREATE INDEX "bill_items_tenant_id_order_item_id_idx" ON "bill_items"("tenant_id", "order_item_id");

CREATE TABLE "bill_taxes" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "bill_id" UUID NOT NULL,
  "tax_name" VARCHAR(40) NOT NULL,
  "tax_rate" DECIMAL(5,2) NOT NULL,
  "tax_amount_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bill_taxes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bill_taxes_rate_check" CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100),
  CONSTRAINT "bill_taxes_amount_check" CHECK ("tax_amount_minor" >= 0),
  CONSTRAINT "bill_taxes_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "bill_taxes_bill_fkey" FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bills"("tenant_id", "id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "bill_taxes_tenant_id_id_key" ON "bill_taxes"("tenant_id", "id");
CREATE INDEX "bill_taxes_tenant_id_bill_id_idx" ON "bill_taxes"("tenant_id", "bill_id");

ALTER TABLE "bill_number_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bill_number_counters" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bills" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bill_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bill_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bill_taxes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bill_taxes" FORCE ROW LEVEL SECURITY;

CREATE POLICY "bill_number_counters_tenant_isolation" ON "bill_number_counters"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
CREATE POLICY "bills_tenant_isolation" ON "bills"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
CREATE POLICY "bill_items_tenant_isolation" ON "bill_items"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
CREATE POLICY "bill_taxes_tenant_isolation" ON "bill_taxes"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
