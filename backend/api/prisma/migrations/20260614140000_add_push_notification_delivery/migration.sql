CREATE TYPE "communication_push_platform" AS ENUM ('ANDROID', 'IOS', 'WEB');
CREATE TYPE "communication_push_application" AS ENUM (
  'RESTAURANT_APP', 'ADMIN', 'SUPER_ADMIN', 'CUSTOMER', 'KITCHEN_DISPLAY'
);
CREATE TYPE "communication_push_device_status" AS ENUM ('ACTIVE', 'INACTIVE', 'INVALID');

CREATE TABLE "communication_push_devices" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "user_id" UUID NOT NULL,
  "application" "communication_push_application" NOT NULL,
  "platform" "communication_push_platform" NOT NULL,
  "device_id" VARCHAR(160) NOT NULL,
  "token_ciphertext" TEXT NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "token_masked" VARCHAR(32) NOT NULL,
  "status" "communication_push_device_status" NOT NULL DEFAULT 'ACTIVE',
  "last_registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivated_at" TIMESTAMPTZ(3),
  "invalidated_at" TIMESTAMPTZ(3),
  "invalid_reason" VARCHAR(120),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "communication_push_devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_push_devices_content_check"
    CHECK (
      length(btrim("device_id")) > 0
      AND length(btrim("token_ciphertext")) > 0
      AND "token_hash" ~ '^[0-9a-f]{64}$'
      AND length(btrim("token_masked")) > 0
    ),
  CONSTRAINT "communication_push_devices_status_check"
    CHECK (
      ("status" = 'ACTIVE' AND "deactivated_at" IS NULL AND "invalidated_at" IS NULL)
      OR
      ("status" = 'INACTIVE' AND "deactivated_at" IS NOT NULL AND "invalidated_at" IS NULL)
      OR
      ("status" = 'INVALID' AND "deactivated_at" IS NOT NULL AND "invalidated_at" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "communication_push_devices_tenant_id_id_key"
  ON "communication_push_devices"("tenant_id", "id");
CREATE UNIQUE INDEX "communication_push_devices_installation_key"
  ON "communication_push_devices"("tenant_id", "user_id", "application", "device_id");
CREATE UNIQUE INDEX "communication_push_devices_active_token_key"
  ON "communication_push_devices"("tenant_id", "token_hash")
  WHERE "status" = 'ACTIVE';
CREATE INDEX "communication_push_devices_token_idx"
  ON "communication_push_devices"("tenant_id", "token_hash");
CREATE INDEX "communication_push_devices_user_status_idx"
  ON "communication_push_devices"("tenant_id", "user_id", "status", "last_seen_at");

ALTER TABLE "communication_push_devices"
  ADD CONSTRAINT "communication_push_devices_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_push_devices"
  ADD CONSTRAINT "communication_push_devices_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_push_devices"
  ADD CONSTRAINT "communication_push_devices_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_push_devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_push_devices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "communication_push_devices_tenant_isolation" ON "communication_push_devices"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE TRIGGER "communication_push_devices_no_delete"
BEFORE DELETE ON "communication_push_devices"
FOR EACH ROW EXECUTE FUNCTION reject_communication_history_delete();
