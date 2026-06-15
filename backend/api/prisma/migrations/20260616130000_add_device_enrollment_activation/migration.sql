CREATE TYPE "device_enrollment_status" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'ACTIVATED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TABLE "device_enrollments" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "device_id" UUID NOT NULL,
  "status" "device_enrollment_status" NOT NULL DEFAULT 'REQUESTED',
  "activation_code_hash" CHAR(64) NOT NULL,
  "activation_code_masked" VARCHAR(32) NOT NULL,
  "requested_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "activated_by_user_id" UUID,
  "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_at" TIMESTAMPTZ(3),
  "activated_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "cancelled_at" TIMESTAMPTZ(3),
  "cancellation_reason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "device_enrollments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_enrollments_version_check" CHECK ("version" > 0),
  CONSTRAINT "device_enrollments_expiry_check" CHECK ("expires_at" > "requested_at"),
  CONSTRAINT "device_enrollments_approval_check" CHECK (
    ("status" = 'REQUESTED' AND "approved_at" IS NULL AND "approved_by_user_id" IS NULL)
    OR
    ("status" IN ('APPROVED', 'ACTIVATED') AND "approved_at" IS NOT NULL AND "approved_by_user_id" IS NOT NULL)
    OR
    ("status" IN ('EXPIRED', 'CANCELLED'))
  ),
  CONSTRAINT "device_enrollments_activation_check" CHECK (
    ("status" <> 'ACTIVATED' AND "activated_at" IS NULL AND "activated_by_user_id" IS NULL)
    OR
    ("status" = 'ACTIVATED' AND "activated_at" IS NOT NULL AND "activated_by_user_id" IS NOT NULL)
  ),
  CONSTRAINT "device_enrollments_cancel_check" CHECK (
    ("status" <> 'CANCELLED' AND "cancelled_at" IS NULL)
    OR
    ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "device_enrollments_tenant_id_id_key"
  ON "device_enrollments"("tenant_id", "id");
CREATE UNIQUE INDEX "device_enrollments_one_active_per_device_key"
  ON "device_enrollments"("tenant_id", "device_id")
  WHERE "status" IN ('REQUESTED', 'APPROVED');
CREATE INDEX "device_enrollments_device_status_idx"
  ON "device_enrollments"("tenant_id", "device_id", "status");
CREATE INDEX "device_enrollments_status_expiry_idx"
  ON "device_enrollments"("tenant_id", "status", "expires_at");
CREATE INDEX "device_enrollments_activation_code_idx"
  ON "device_enrollments"("tenant_id", "activation_code_hash", "status", "expires_at");

ALTER TABLE "device_enrollments"
  ADD CONSTRAINT "device_enrollments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_enrollments"
  ADD CONSTRAINT "device_enrollments_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_enrollments"
  ADD CONSTRAINT "device_enrollments_device_id_fkey"
  FOREIGN KEY ("tenant_id", "device_id") REFERENCES "devices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_enrollments"
  ADD CONSTRAINT "device_enrollments_requested_by_user_id_fkey"
  FOREIGN KEY ("requested_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_enrollments"
  ADD CONSTRAINT "device_enrollments_approved_by_user_id_fkey"
  FOREIGN KEY ("approved_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_enrollments"
  ADD CONSTRAINT "device_enrollments_activated_by_user_id_fkey"
  FOREIGN KEY ("activated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "device_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_enrollments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "device_enrollments_tenant_isolation" ON "device_enrollments"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_device_enrollment_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'device enrollments cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "device_enrollments_no_delete"
BEFORE DELETE ON "device_enrollments"
FOR EACH ROW EXECUTE FUNCTION reject_device_enrollment_delete();
