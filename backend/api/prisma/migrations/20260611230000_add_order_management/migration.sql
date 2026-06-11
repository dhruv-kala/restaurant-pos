CREATE TYPE "order_type" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_ORDER');
CREATE TYPE "order_status" AS ENUM ('PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "order_item_status" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

CREATE TABLE "order_number_counters" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_number_counters_last_number_check" CHECK ("last_number" > 0),
  CONSTRAINT "order_number_counters_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "order_number_counters_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "order_number_counters_tenant_id_outlet_id_business_date_key"
  ON "order_number_counters"("tenant_id", "outlet_id", "business_date");
CREATE INDEX "order_number_counters_tenant_id_outlet_id_idx"
  ON "order_number_counters"("tenant_id", "outlet_id");

CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "table_id" UUID,
  "customer_id" UUID,
  "order_number" VARCHAR(32) NOT NULL,
  "order_type" "order_type" NOT NULL,
  "status" "order_status" NOT NULL DEFAULT 'PENDING',
  "waiter_id" UUID,
  "guest_count" INTEGER NOT NULL DEFAULT 1,
  "notes" VARCHAR(1000),
  "currency_code" CHAR(3) NOT NULL,
  "subtotal_minor" INTEGER NOT NULL DEFAULT 0,
  "discount_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "service_charge_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "grand_total_minor" INTEGER NOT NULL DEFAULT 0,
  "cancellation_reason" VARCHAR(500),
  "completed_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_guest_count_positive_check" CHECK ("guest_count" > 0),
  CONSTRAINT "orders_money_nonnegative_check" CHECK (
    "subtotal_minor" >= 0 AND "discount_amount_minor" >= 0 AND
    "tax_amount_minor" >= 0 AND "service_charge_amount_minor" >= 0 AND
    "grand_total_minor" >= 0
  ),
  CONSTRAINT "orders_type_requirements_check" CHECK (
    ("order_type" = 'DINE_IN' AND "table_id" IS NOT NULL) OR
    ("order_type" = 'DELIVERY' AND "table_id" IS NULL AND "customer_id" IS NOT NULL) OR
    ("order_type" IN ('TAKEAWAY', 'QR_ORDER') AND "table_id" IS NULL)
  ),
  CONSTRAINT "orders_completion_check" CHECK (
    ("status" = 'COMPLETED' AND "completed_at" IS NOT NULL) OR
    ("status" <> 'COMPLETED')
  ),
  CONSTRAINT "orders_cancellation_check" CHECK (
    ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND "cancellation_reason" IS NOT NULL) OR
    ("status" <> 'CANCELLED')
  ),
  CONSTRAINT "orders_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "orders_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "orders_table_fkey" FOREIGN KEY ("tenant_id", "outlet_id", "table_id") REFERENCES "dining_tables"("tenant_id", "outlet_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "orders_waiter_fkey" FOREIGN KEY ("waiter_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "orders_tenant_id_id_key" ON "orders"("tenant_id", "id");
CREATE UNIQUE INDEX "orders_tenant_id_outlet_id_order_number_key"
  ON "orders"("tenant_id", "outlet_id", "order_number");
CREATE INDEX "orders_tenant_id_outlet_id_status_created_at_idx"
  ON "orders"("tenant_id", "outlet_id", "status", "created_at");
CREATE INDEX "orders_tenant_id_outlet_id_table_id_status_idx"
  ON "orders"("tenant_id", "outlet_id", "table_id", "status");
CREATE INDEX "orders_tenant_id_outlet_id_waiter_id_created_at_idx"
  ON "orders"("tenant_id", "outlet_id", "waiter_id", "created_at");
CREATE INDEX "orders_tenant_id_customer_id_created_at_idx"
  ON "orders"("tenant_id", "customer_id", "created_at");

CREATE TABLE "order_items" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "menu_item_id" UUID NOT NULL,
  "variant_id" UUID,
  "item_name" VARCHAR(160) NOT NULL,
  "variant_name" VARCHAR(120),
  "quantity" INTEGER NOT NULL,
  "unit_price_minor" INTEGER NOT NULL,
  "discount_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "line_total_minor" INTEGER NOT NULL,
  "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "special_instructions" VARCHAR(500),
  "status" "order_item_status" NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "order_items_money_nonnegative_check" CHECK (
    "unit_price_minor" >= 0 AND "discount_amount_minor" >= 0 AND
    "tax_amount_minor" >= 0 AND "line_total_minor" >= 0
  ),
  CONSTRAINT "order_items_tax_percentage_check" CHECK ("tax_percentage" >= 0 AND "tax_percentage" <= 100),
  CONSTRAINT "order_items_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "order_items_order_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "order_items_menu_item_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "order_items_variant_fkey" FOREIGN KEY ("tenant_id", "variant_id") REFERENCES "menu_item_variants"("tenant_id", "id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "order_items_tenant_id_id_key" ON "order_items"("tenant_id", "id");
CREATE INDEX "order_items_tenant_id_order_id_status_deleted_at_idx"
  ON "order_items"("tenant_id", "order_id", "status", "deleted_at");
CREATE INDEX "order_items_tenant_id_menu_item_id_idx"
  ON "order_items"("tenant_id", "menu_item_id");

ALTER TABLE "order_number_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_number_counters" FORCE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "order_number_counters_tenant_isolation" ON "order_number_counters"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
CREATE POLICY "orders_tenant_isolation" ON "orders"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
CREATE POLICY "order_items_tenant_isolation" ON "order_items"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
