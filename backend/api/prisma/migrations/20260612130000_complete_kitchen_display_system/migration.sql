ALTER TYPE "order_priority" ADD VALUE IF NOT EXISTS 'URGENT';

CREATE TABLE "kitchen_stations" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code" CITEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "kitchen_stations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kitchen_stations_display_order_check" CHECK ("display_order" >= 0)
);

CREATE TABLE "kitchen_station_assignments" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "kitchen_station_id" UUID NOT NULL,
  "menu_item_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kitchen_station_assignments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_items"
  ADD COLUMN "kitchen_station_id" UUID,
  ADD COLUMN "started_by_user_id" UUID,
  ADD COLUMN "ready_by_user_id" UUID,
  ADD COLUMN "served_by_user_id" UUID;

CREATE UNIQUE INDEX "kitchen_stations_tenant_id_id_key"
  ON "kitchen_stations"("tenant_id", "id");
CREATE UNIQUE INDEX "kitchen_stations_tenant_id_outlet_id_id_key"
  ON "kitchen_stations"("tenant_id", "outlet_id", "id");
CREATE UNIQUE INDEX "kitchen_stations_tenant_id_outlet_id_code_key"
  ON "kitchen_stations"("tenant_id", "outlet_id", "code");
CREATE UNIQUE INDEX "kitchen_stations_tenant_id_outlet_id_name_key"
  ON "kitchen_stations"("tenant_id", "outlet_id", "name");
CREATE INDEX "kitchen_stations_queue_lookup_idx"
  ON "kitchen_stations"("tenant_id", "outlet_id", "is_active", "display_order", "deleted_at");
CREATE UNIQUE INDEX "kitchen_station_assignments_tenant_id_id_key"
  ON "kitchen_station_assignments"("tenant_id", "id");
CREATE UNIQUE INDEX "kitchen_station_assignments_station_menu_key"
  ON "kitchen_station_assignments"("tenant_id", "outlet_id", "kitchen_station_id", "menu_item_id");
CREATE INDEX "kitchen_station_assignments_menu_lookup_idx"
  ON "kitchen_station_assignments"("tenant_id", "outlet_id", "menu_item_id");
CREATE INDEX "kitchen_station_assignments_station_idx"
  ON "kitchen_station_assignments"("tenant_id", "kitchen_station_id");
CREATE INDEX "order_items_station_queue_idx"
  ON "order_items"("tenant_id", "kitchen_station_id", "status", "deleted_at");

ALTER TABLE "kitchen_stations"
  ADD CONSTRAINT "kitchen_stations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "kitchen_stations_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kitchen_station_assignments"
  ADD CONSTRAINT "kitchen_station_assignments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "kitchen_station_assignments_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "kitchen_station_assignments_station_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id", "kitchen_station_id")
  REFERENCES "kitchen_stations"("tenant_id", "outlet_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "kitchen_station_assignments_menu_item_fkey"
  FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_kitchen_station_fkey"
  FOREIGN KEY ("tenant_id", "kitchen_station_id") REFERENCES "kitchen_stations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "order_items_started_by_user_fkey"
  FOREIGN KEY ("started_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "order_items_ready_by_user_fkey"
  FOREIGN KEY ("ready_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "order_items_served_by_user_fkey"
  FOREIGN KEY ("served_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "kitchen_stations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kitchen_stations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "kitchen_stations_tenant_isolation" ON "kitchen_stations"
  USING (app_tenant_access_allowed("tenant_id"))
  WITH CHECK (app_tenant_access_allowed("tenant_id"));

ALTER TABLE "kitchen_station_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kitchen_station_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "kitchen_station_assignments_tenant_isolation" ON "kitchen_station_assignments"
  USING (app_tenant_access_allowed("tenant_id"))
  WITH CHECK (app_tenant_access_allowed("tenant_id"));
