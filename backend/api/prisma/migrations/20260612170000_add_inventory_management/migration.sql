CREATE TYPE "stock_transaction_type" AS ENUM (
  'PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CONSUMPTION',
  'TRANSFER_IN', 'TRANSFER_OUT', 'WASTAGE', 'RETURN'
);
CREATE TYPE "purchase_order_status" AS ENUM (
  'DRAFT', 'PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'
);
CREATE TYPE "inventory_alert_type" AS ENUM (
  'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRY_WARNING', 'NEGATIVE_STOCK'
);

CREATE TABLE "inventory_categories" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "name" CITEXT NOT NULL,
  "description" VARCHAR(500),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "units_of_measure" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "code" CITEXT NOT NULL,
  "base_unit" BOOLEAN NOT NULL DEFAULT false,
  "conversion_factor" DECIMAL(18,6) NOT NULL DEFAULT 1,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "units_of_measure_conversion_factor_check" CHECK ("conversion_factor" > 0)
);

CREATE TABLE "ingredients" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "sku" CITEXT NOT NULL,
  "barcode" VARCHAR(64),
  "description" VARCHAR(500),
  "cost_price_minor" INTEGER NOT NULL DEFAULT 0,
  "reorder_level" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "minimum_stock" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "maximum_stock" DECIMAL(18,3),
  "track_expiry" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ingredients_cost_check" CHECK ("cost_price_minor" >= 0),
  CONSTRAINT "ingredients_stock_levels_check" CHECK (
    "reorder_level" >= 0 AND "minimum_stock" >= 0 AND
    ("maximum_stock" IS NULL OR "maximum_stock" >= "minimum_stock")
  )
);

CREATE TABLE "inventory_stocks" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "available_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "reserved_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "damaged_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "last_stock_update" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_stocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_stock_quantities_check" CHECK (
    "available_quantity" >= 0 AND "reserved_quantity" >= 0 AND "damaged_quantity" >= 0
  )
);

CREATE TABLE "inventory_batches" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "stock_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "batch_number" VARCHAR(80) NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "manufacturing_date" DATE,
  "expiry_date" DATE,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_batches_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "inventory_batches_dates_check" CHECK (
    "manufacturing_date" IS NULL OR "expiry_date" IS NULL OR
    "expiry_date" >= "manufacturing_date"
  )
);

CREATE TABLE "stock_transactions" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "stock_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "transaction_type" "stock_transaction_type" NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "unit_cost_minor" INTEGER NOT NULL DEFAULT 0,
  "reference_type" VARCHAR(50),
  "reference_id" UUID,
  "notes" VARCHAR(500),
  "performed_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transactions_quantity_check" CHECK ("quantity" <> 0),
  CONSTRAINT "stock_transactions_cost_check" CHECK ("unit_cost_minor" >= 0)
);

CREATE TABLE "vendors" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "email" CITEXT,
  "phone" VARCHAR(20),
  "gst_number" VARCHAR(32),
  "address" VARCHAR(500),
  "contact_person" VARCHAR(160),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_order_number_counters" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "purchase_order_number_counters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_order_counter_positive_check" CHECK ("last_number" > 0)
);

CREATE TABLE "purchase_orders" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "vendor_id" UUID NOT NULL,
  "po_number" VARCHAR(40) NOT NULL,
  "status" "purchase_order_status" NOT NULL DEFAULT 'DRAFT',
  "order_date" DATE NOT NULL,
  "expected_date" DATE,
  "subtotal_minor" INTEGER NOT NULL DEFAULT 0,
  "tax_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "grand_total_minor" INTEGER NOT NULL DEFAULT 0,
  "notes" VARCHAR(500),
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "received_by_user_id" UUID,
  "received_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_orders_amounts_check" CHECK (
    "subtotal_minor" >= 0 AND "tax_amount_minor" >= 0 AND
    "grand_total_minor" = "subtotal_minor" + "tax_amount_minor"
  ),
  CONSTRAINT "purchase_orders_dates_check" CHECK (
    "expected_date" IS NULL OR "expected_date" >= "order_date"
  ),
  CONSTRAINT "purchase_orders_received_check" CHECK (
    ("status" = 'RECEIVED' AND "received_by_user_id" IS NOT NULL AND "received_at" IS NOT NULL)
    OR ("status" <> 'RECEIVED' AND "received_by_user_id" IS NULL AND "received_at" IS NULL)
  )
);

CREATE TABLE "purchase_order_items" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "purchase_order_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "unit_cost_minor" INTEGER NOT NULL,
  "line_total_minor" INTEGER NOT NULL,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_order_items_values_check" CHECK (
    "quantity" > 0 AND "unit_cost_minor" >= 0 AND "line_total_minor" >= 0
  )
);

CREATE TABLE "inventory_alerts" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "alert_type" "inventory_alert_type" NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "is_resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolved_by_user_id" UUID,
  "resolved_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_alerts_resolution_check" CHECK (
    ("is_resolved" AND "resolved_at" IS NOT NULL)
    OR (NOT "is_resolved" AND "resolved_by_user_id" IS NULL AND "resolved_at" IS NULL)
  )
);

CREATE UNIQUE INDEX "inventory_categories_tenant_id_id_key" ON "inventory_categories"("tenant_id", "id");
CREATE UNIQUE INDEX "inventory_categories_tenant_id_name_key" ON "inventory_categories"("tenant_id", "name");
CREATE INDEX "inventory_categories_active_idx" ON "inventory_categories"("tenant_id", "is_active", "deleted_at");
CREATE UNIQUE INDEX "units_of_measure_tenant_id_id_key" ON "units_of_measure"("tenant_id", "id");
CREATE UNIQUE INDEX "units_of_measure_tenant_id_code_key" ON "units_of_measure"("tenant_id", "code");
CREATE INDEX "units_of_measure_lookup_idx" ON "units_of_measure"("tenant_id", "deleted_at");
CREATE UNIQUE INDEX "ingredients_tenant_id_id_key" ON "ingredients"("tenant_id", "id");
CREATE UNIQUE INDEX "ingredients_tenant_id_sku_key" ON "ingredients"("tenant_id", "sku");
CREATE UNIQUE INDEX "ingredients_tenant_id_barcode_key" ON "ingredients"("tenant_id", "barcode");
CREATE INDEX "ingredients_category_idx" ON "ingredients"("tenant_id", "category_id", "is_active", "deleted_at");
CREATE INDEX "ingredients_name_idx" ON "ingredients"("tenant_id", "name");
CREATE UNIQUE INDEX "inventory_stocks_tenant_id_id_key" ON "inventory_stocks"("tenant_id", "id");
CREATE UNIQUE INDEX "inventory_stocks_outlet_ingredient_key" ON "inventory_stocks"("tenant_id", "outlet_id", "ingredient_id");
CREATE INDEX "inventory_stocks_level_idx" ON "inventory_stocks"("tenant_id", "outlet_id", "available_quantity");
CREATE UNIQUE INDEX "inventory_batches_tenant_id_id_key" ON "inventory_batches"("tenant_id", "id");
CREATE UNIQUE INDEX "inventory_batches_number_key" ON "inventory_batches"("tenant_id", "outlet_id", "ingredient_id", "batch_number");
CREATE INDEX "inventory_batches_expiry_idx" ON "inventory_batches"("tenant_id", "outlet_id", "expiry_date");
CREATE UNIQUE INDEX "stock_transactions_tenant_id_id_key" ON "stock_transactions"("tenant_id", "id");
CREATE INDEX "stock_transactions_history_idx" ON "stock_transactions"("tenant_id", "outlet_id", "ingredient_id", "created_at");
CREATE INDEX "stock_transactions_reference_idx" ON "stock_transactions"("tenant_id", "reference_type", "reference_id");
CREATE UNIQUE INDEX "vendors_tenant_id_id_key" ON "vendors"("tenant_id", "id");
CREATE UNIQUE INDEX "vendors_tenant_id_name_key" ON "vendors"("tenant_id", "name");
CREATE INDEX "vendors_active_idx" ON "vendors"("tenant_id", "is_active", "deleted_at");
CREATE UNIQUE INDEX "purchase_order_counters_key" ON "purchase_order_number_counters"("tenant_id", "outlet_id", "business_date");
CREATE INDEX "purchase_order_counters_outlet_idx" ON "purchase_order_number_counters"("tenant_id", "outlet_id");
CREATE UNIQUE INDEX "purchase_orders_tenant_id_id_key" ON "purchase_orders"("tenant_id", "id");
CREATE UNIQUE INDEX "purchase_orders_number_key" ON "purchase_orders"("tenant_id", "outlet_id", "po_number");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("tenant_id", "outlet_id", "status", "order_date");
CREATE INDEX "purchase_orders_vendor_idx" ON "purchase_orders"("tenant_id", "vendor_id", "status");
CREATE UNIQUE INDEX "purchase_order_items_tenant_id_id_key" ON "purchase_order_items"("tenant_id", "id");
CREATE UNIQUE INDEX "purchase_order_items_ingredient_key" ON "purchase_order_items"("tenant_id", "purchase_order_id", "ingredient_id");
CREATE INDEX "purchase_order_items_lookup_idx" ON "purchase_order_items"("tenant_id", "outlet_id", "ingredient_id");
CREATE UNIQUE INDEX "inventory_alerts_tenant_id_id_key" ON "inventory_alerts"("tenant_id", "id");
CREATE UNIQUE INDEX "inventory_alerts_open_key" ON "inventory_alerts"("tenant_id", "outlet_id", "ingredient_id", "alert_type") WHERE "is_resolved" = false;
CREATE INDEX "inventory_alerts_queue_idx" ON "inventory_alerts"("tenant_id", "outlet_id", "is_resolved", "alert_type", "created_at");
CREATE INDEX "inventory_alerts_ingredient_idx" ON "inventory_alerts"("tenant_id", "ingredient_id", "is_resolved");

ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ingredients_category_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "inventory_categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ingredients_unit_fkey" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units_of_measure"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ingredients_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ingredients_updated_by_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_stocks"
  ADD CONSTRAINT "inventory_stocks_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_stocks_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_stocks_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_batches"
  ADD CONSTRAINT "inventory_batches_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_batches_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_batches_stock_fkey" FOREIGN KEY ("tenant_id", "stock_id") REFERENCES "inventory_stocks"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_batches_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transactions"
  ADD CONSTRAINT "stock_transactions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_transactions_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_transactions_stock_fkey" FOREIGN KEY ("tenant_id", "stock_id") REFERENCES "inventory_stocks"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_transactions_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_transactions_performed_by_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendors"
  ADD CONSTRAINT "vendors_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "vendors_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "vendors_updated_by_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_number_counters"
  ADD CONSTRAINT "purchase_order_counters_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_order_counters_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders"
  ADD CONSTRAINT "purchase_orders_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_orders_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_orders_vendor_fkey" FOREIGN KEY ("tenant_id", "vendor_id") REFERENCES "vendors"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_orders_updated_by_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_orders_received_by_fkey" FOREIGN KEY ("received_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items"
  ADD CONSTRAINT "purchase_order_items_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_order_items_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_order_items_order_fkey" FOREIGN KEY ("tenant_id", "purchase_order_id") REFERENCES "purchase_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_order_items_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_alerts"
  ADD CONSTRAINT "inventory_alerts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_alerts_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_alerts_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'inventory_categories', 'units_of_measure', 'ingredients',
    'inventory_stocks', 'inventory_batches', 'stock_transactions',
    'vendors', 'purchase_order_number_counters', 'purchase_orders',
    'purchase_order_items', 'inventory_alerts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (app_tenant_access_allowed(tenant_id)) WITH CHECK (app_tenant_access_allowed(tenant_id))',
      table_name || '_tenant_isolation', table_name
    );
  END LOOP;
END $$;
