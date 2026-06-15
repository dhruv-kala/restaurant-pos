CREATE TYPE "terminal_type" AS ENUM (
  'POS_COUNTER',
  'CASHIER_STATION',
  'KITCHEN_SCREEN',
  'WAITER_STATION',
  'CUSTOMER_KIOSK'
);

CREATE TYPE "terminal_status" AS ENUM (
  'ACTIVE',
  'INACTIVE'
);

CREATE TYPE "device_assignment_status" AS ENUM (
  'ACTIVE',
  'ENDED'
);

CREATE TABLE "terminals" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "terminal_code" CITEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "terminal_type" "terminal_type" NOT NULL,
  "status" "terminal_status" NOT NULL DEFAULT 'ACTIVE',
  "description" VARCHAR(500),
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),

  CONSTRAINT "terminals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "terminals_version_check" CHECK ("version" > 0)
);

CREATE TABLE "device_assignments" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "terminal_id" UUID NOT NULL,
  "device_id" UUID NOT NULL,
  "status" "device_assignment_status" NOT NULL DEFAULT 'ACTIVE',
  "assigned_by_user_id" UUID NOT NULL,
  "ended_by_user_id" UUID,
  "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMPTZ(3),
  "end_reason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "device_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_assignments_version_check" CHECK ("version" > 0),
  CONSTRAINT "device_assignments_end_check" CHECK (
    ("status" = 'ACTIVE' AND "ended_at" IS NULL AND "ended_by_user_id" IS NULL)
    OR
    ("status" = 'ENDED' AND "ended_at" IS NOT NULL AND "ended_by_user_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "terminals_tenant_id_id_key"
  ON "terminals"("tenant_id", "id");
CREATE UNIQUE INDEX "terminals_outlet_code_key"
  ON "terminals"("tenant_id", "outlet_id", "terminal_code");
CREATE INDEX "terminals_outlet_status_idx"
  ON "terminals"("tenant_id", "outlet_id", "status", "deleted_at");
CREATE INDEX "terminals_type_status_idx"
  ON "terminals"("tenant_id", "terminal_type", "status");

CREATE UNIQUE INDEX "device_assignments_tenant_id_id_key"
  ON "device_assignments"("tenant_id", "id");
CREATE UNIQUE INDEX "device_assignments_one_active_per_terminal_key"
  ON "device_assignments"("tenant_id", "terminal_id")
  WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "device_assignments_one_active_per_device_key"
  ON "device_assignments"("tenant_id", "device_id")
  WHERE "status" = 'ACTIVE';
CREATE INDEX "device_assignments_terminal_status_idx"
  ON "device_assignments"("tenant_id", "terminal_id", "status");
CREATE INDEX "device_assignments_device_status_idx"
  ON "device_assignments"("tenant_id", "device_id", "status");
CREATE INDEX "device_assignments_outlet_status_idx"
  ON "device_assignments"("tenant_id", "outlet_id", "status");

ALTER TABLE "terminals"
  ADD CONSTRAINT "terminals_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "terminals"
  ADD CONSTRAINT "terminals_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "terminals"
  ADD CONSTRAINT "terminals_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "terminals"
  ADD CONSTRAINT "terminals_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "device_assignments"
  ADD CONSTRAINT "device_assignments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_assignments"
  ADD CONSTRAINT "device_assignments_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_assignments"
  ADD CONSTRAINT "device_assignments_terminal_id_fkey"
  FOREIGN KEY ("tenant_id", "terminal_id") REFERENCES "terminals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_assignments"
  ADD CONSTRAINT "device_assignments_device_id_fkey"
  FOREIGN KEY ("tenant_id", "device_id") REFERENCES "devices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_assignments"
  ADD CONSTRAINT "device_assignments_assigned_by_user_id_fkey"
  FOREIGN KEY ("assigned_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_assignments"
  ADD CONSTRAINT "device_assignments_ended_by_user_id_fkey"
  FOREIGN KEY ("ended_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "terminals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "terminals" FORCE ROW LEVEL SECURITY;
CREATE POLICY "terminals_tenant_isolation" ON "terminals"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "device_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "device_assignments_tenant_isolation" ON "device_assignments"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_device_assignment_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'device assignments cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "device_assignments_no_delete"
BEFORE DELETE ON "device_assignments"
FOR EACH ROW EXECUTE FUNCTION reject_device_assignment_delete();
