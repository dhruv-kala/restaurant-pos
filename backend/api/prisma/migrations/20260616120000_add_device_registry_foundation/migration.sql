CREATE TYPE "device_type" AS ENUM (
  'POS_TERMINAL',
  'CASHIER_DEVICE',
  'WAITER_DEVICE',
  'KITCHEN_DISPLAY',
  'CUSTOMER_KIOSK',
  'TABLET',
  'MOBILE_DEVICE',
  'ADMIN_WORKSTATION'
);

CREATE TYPE "device_status" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED', 'REVOKED');

CREATE TABLE "devices" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "device_identifier" CITEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "device_type" "device_type" NOT NULL,
  "status" "device_status" NOT NULL DEFAULT 'PENDING',
  "platform" VARCHAR(80),
  "manufacturer" VARCHAR(120),
  "model" VARCHAR(120),
  "os_version" VARCHAR(80),
  "app_version" VARCHAR(80),
  "serial_number" VARCHAR(160),
  "metadata" JSONB,
  "registered_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ(3),
  "status_changed_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "devices_version_check" CHECK ("version" > 0),
  CONSTRAINT "devices_identifier_not_blank_check" CHECK (btrim("device_identifier"::text) <> ''),
  CONSTRAINT "devices_name_not_blank_check" CHECK (btrim("name") <> ''),
  CONSTRAINT "devices_status_changed_check" CHECK (
    ("status" = 'PENDING' AND "status_changed_at" IS NULL)
    OR
    ("status" <> 'PENDING' AND "status_changed_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "devices_tenant_id_id_key"
  ON "devices"("tenant_id", "id");
CREATE UNIQUE INDEX "devices_tenant_identifier_key"
  ON "devices"("tenant_id", "device_identifier");
CREATE INDEX "devices_outlet_status_idx"
  ON "devices"("tenant_id", "outlet_id", "status");
CREATE INDEX "devices_type_status_idx"
  ON "devices"("tenant_id", "device_type", "status");
CREATE INDEX "devices_status_updated_idx"
  ON "devices"("tenant_id", "status", "updated_at");

ALTER TABLE "devices"
  ADD CONSTRAINT "devices_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devices"
  ADD CONSTRAINT "devices_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devices"
  ADD CONSTRAINT "devices_registered_by_user_id_fkey"
  FOREIGN KEY ("registered_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devices"
  ADD CONSTRAINT "devices_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "devices_tenant_isolation" ON "devices"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_device_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'devices cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "devices_no_delete"
BEFORE DELETE ON "devices"
FOR EACH ROW EXECUTE FUNCTION reject_device_delete();
