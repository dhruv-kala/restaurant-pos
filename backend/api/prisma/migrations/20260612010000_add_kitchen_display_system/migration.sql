CREATE TYPE "order_priority" AS ENUM ('NORMAL', 'HIGH', 'VIP');

CREATE TABLE "kitchen_categories" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "kitchen_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kitchen_categories_display_order_check" CHECK ("display_order" >= 0),
  CONSTRAINT "kitchen_categories_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "kitchen_categories_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "kitchen_categories_tenant_id_id_key"
  ON "kitchen_categories"("tenant_id", "id");
CREATE UNIQUE INDEX "kitchen_categories_tenant_id_outlet_id_id_key"
  ON "kitchen_categories"("tenant_id", "outlet_id", "id");
CREATE UNIQUE INDEX "kitchen_categories_tenant_id_outlet_id_name_key"
  ON "kitchen_categories"("tenant_id", "outlet_id", "name");
CREATE INDEX "kitchen_categories_tenant_id_outlet_id_is_active_deleted_at_idx"
  ON "kitchen_categories"("tenant_id", "outlet_id", "is_active", "deleted_at");

ALTER TABLE "menu_items" ADD COLUMN "kitchen_category_id" UUID;
ALTER TABLE "orders" ADD COLUMN "priority" "order_priority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "orders" ADD COLUMN "estimated_completion_time" TIMESTAMPTZ(3);
ALTER TABLE "order_items" ADD COLUMN "kitchen_category_id" UUID;
ALTER TABLE "order_items" ADD COLUMN "fired_at" TIMESTAMPTZ(3);
ALTER TABLE "order_items" ADD COLUMN "started_at" TIMESTAMPTZ(3);
ALTER TABLE "order_items" ADD COLUMN "ready_at" TIMESTAMPTZ(3);
ALTER TABLE "order_items" ADD COLUMN "served_at" TIMESTAMPTZ(3);
ALTER TABLE "order_items" ADD COLUMN "estimated_prep_minutes" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "order_items" ADD COLUMN "actual_prep_minutes" INTEGER;

ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_kitchen_category_fkey"
  FOREIGN KEY ("tenant_id", "kitchen_category_id")
  REFERENCES "kitchen_categories"("tenant_id", "id") ON DELETE RESTRICT;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_kitchen_category_fkey"
  FOREIGN KEY ("tenant_id", "kitchen_category_id")
  REFERENCES "kitchen_categories"("tenant_id", "id") ON DELETE RESTRICT;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_estimated_prep_minutes_positive_check"
  CHECK ("estimated_prep_minutes" > 0);
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_actual_prep_minutes_nonnegative_check"
  CHECK ("actual_prep_minutes" IS NULL OR "actual_prep_minutes" >= 0);
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_kds_timestamps_check"
  CHECK (
    ("ready_at" IS NULL OR "started_at" IS NOT NULL) AND
    ("served_at" IS NULL OR "ready_at" IS NOT NULL)
  );

CREATE INDEX "menu_items_tenant_id_kitchen_category_id_idx"
  ON "menu_items"("tenant_id", "kitchen_category_id");
CREATE INDEX "orders_tenant_id_outlet_id_priority_status_idx"
  ON "orders"("tenant_id", "outlet_id", "priority", "status");
CREATE INDEX "order_items_tenant_id_kitchen_category_id_status_idx"
  ON "order_items"("tenant_id", "kitchen_category_id", "status");

ALTER TABLE "kitchen_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kitchen_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY "kitchen_categories_tenant_isolation" ON "kitchen_categories"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
