CREATE TYPE "dining_table_status" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE');
CREATE TYPE "dining_table_shape" AS ENUM ('RECTANGLE', 'SQUARE', 'ROUND', 'OVAL');
CREATE TYPE "reservation_status" AS ENUM ('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE "table_sections" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500),
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "table_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dining_tables" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "section_id" UUID NOT NULL,
  "table_number" VARCHAR(32) NOT NULL,
  "display_name" VARCHAR(120),
  "capacity" INTEGER NOT NULL,
  "status" "dining_table_status" NOT NULL DEFAULT 'AVAILABLE',
  "x_position" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "y_position" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "shape" "dining_table_shape" NOT NULL DEFAULT 'RECTANGLE',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "dining_tables_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dining_tables_capacity_positive_check" CHECK ("capacity" > 0),
  CONSTRAINT "dining_tables_position_nonnegative_check" CHECK ("x_position" >= 0 AND "y_position" >= 0)
);

CREATE TABLE "table_reservations" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "table_id" UUID NOT NULL,
  "customer_name" VARCHAR(160) NOT NULL,
  "customer_phone" VARCHAR(20),
  "reservation_date" TIMESTAMPTZ(3) NOT NULL,
  "guest_count" INTEGER NOT NULL,
  "special_instructions" VARCHAR(1000),
  "status" "reservation_status" NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "table_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "table_reservations_guest_count_positive_check" CHECK ("guest_count" > 0)
);

CREATE TABLE "merged_tables" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "primary_table_id" UUID NOT NULL,
  "merged_table_ids" UUID[] NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "merged_tables_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "merged_tables_members_required_check" CHECK (cardinality("merged_table_ids") > 0),
  CONSTRAINT "merged_tables_primary_not_member_check" CHECK (NOT ("primary_table_id" = ANY("merged_table_ids")))
);

CREATE UNIQUE INDEX "table_sections_tenant_id_id_key" ON "table_sections"("tenant_id", "id");
CREATE UNIQUE INDEX "table_sections_tenant_id_outlet_id_id_key" ON "table_sections"("tenant_id", "outlet_id", "id");
CREATE UNIQUE INDEX "table_sections_tenant_id_outlet_id_name_key" ON "table_sections"("tenant_id", "outlet_id", "name");
CREATE INDEX "table_sections_tenant_id_outlet_id_is_active_deleted_at_idx" ON "table_sections"("tenant_id", "outlet_id", "is_active", "deleted_at");
CREATE UNIQUE INDEX "dining_tables_tenant_id_id_key" ON "dining_tables"("tenant_id", "id");
CREATE UNIQUE INDEX "dining_tables_tenant_id_outlet_id_id_key" ON "dining_tables"("tenant_id", "outlet_id", "id");
CREATE UNIQUE INDEX "dining_tables_tenant_id_outlet_id_table_number_key" ON "dining_tables"("tenant_id", "outlet_id", "table_number");
CREATE INDEX "dining_tables_tenant_id_outlet_id_section_id_idx" ON "dining_tables"("tenant_id", "outlet_id", "section_id");
CREATE INDEX "dining_tables_tenant_id_outlet_id_status_deleted_at_idx" ON "dining_tables"("tenant_id", "outlet_id", "status", "deleted_at");
CREATE UNIQUE INDEX "table_reservations_tenant_id_id_key" ON "table_reservations"("tenant_id", "id");
CREATE INDEX "table_reservations_tenant_id_outlet_id_reservation_date_idx" ON "table_reservations"("tenant_id", "outlet_id", "reservation_date");
CREATE INDEX "table_reservations_tenant_id_outlet_id_table_id_status_idx" ON "table_reservations"("tenant_id", "outlet_id", "table_id", "status");
CREATE UNIQUE INDEX "table_reservations_active_slot_key" ON "table_reservations"("tenant_id", "table_id", "reservation_date") WHERE "deleted_at" IS NULL AND "status" IN ('PENDING', 'CONFIRMED');
CREATE UNIQUE INDEX "merged_tables_tenant_id_id_key" ON "merged_tables"("tenant_id", "id");
CREATE INDEX "merged_tables_tenant_id_outlet_id_is_active_deleted_at_idx" ON "merged_tables"("tenant_id", "outlet_id", "is_active", "deleted_at");

ALTER TABLE "table_sections" ADD CONSTRAINT "table_sections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "table_sections" ADD CONSTRAINT "table_sections_tenant_id_outlet_id_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_tenant_id_outlet_id_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_section_fkey" FOREIGN KEY ("tenant_id", "outlet_id", "section_id") REFERENCES "table_sections"("tenant_id", "outlet_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_tenant_id_outlet_id_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_table_fkey" FOREIGN KEY ("tenant_id", "outlet_id", "table_id") REFERENCES "dining_tables"("tenant_id", "outlet_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merged_tables" ADD CONSTRAINT "merged_tables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merged_tables" ADD CONSTRAINT "merged_tables_tenant_id_outlet_id_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "table_sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_sections" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dining_tables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dining_tables" FORCE ROW LEVEL SECURITY;
ALTER TABLE "table_reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_reservations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "merged_tables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "merged_tables" FORCE ROW LEVEL SECURITY;

CREATE POLICY "table_sections_tenant_isolation" ON "table_sections" USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "dining_tables_tenant_isolation" ON "dining_tables" USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "table_reservations_tenant_isolation" ON "table_reservations" USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "merged_tables_tenant_isolation" ON "merged_tables" USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
