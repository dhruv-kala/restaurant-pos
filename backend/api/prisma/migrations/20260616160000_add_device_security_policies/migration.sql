CREATE TYPE "device_security_policy_status" AS ENUM (
  'ACTIVE',
  'INACTIVE'
);

CREATE TABLE "device_security_policies" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "name" VARCHAR(160) NOT NULL,
  "status" "device_security_policy_status" NOT NULL DEFAULT 'ACTIVE',
  "require_trusted_session" BOOLEAN NOT NULL DEFAULT false,
  "session_timeout_minutes" INTEGER NOT NULL DEFAULT 1440,
  "force_logout_before" TIMESTAMPTZ(3),
  "allowed_device_types" "device_type"[] NOT NULL DEFAULT ARRAY[]::"device_type"[],
  "restrictions" JSONB,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "device_security_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_security_policies_version_check" CHECK ("version" > 0),
  CONSTRAINT "device_security_policies_timeout_check" CHECK ("session_timeout_minutes" BETWEEN 5 AND 43200)
);

CREATE UNIQUE INDEX "device_security_policies_tenant_id_id_key"
  ON "device_security_policies"("tenant_id", "id");
CREATE UNIQUE INDEX "device_security_policies_one_active_per_scope_key"
  ON "device_security_policies"("tenant_id", COALESCE("outlet_id", '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE "status" = 'ACTIVE';
CREATE INDEX "device_security_policies_scope_status_idx"
  ON "device_security_policies"("tenant_id", "outlet_id", "status");
CREATE INDEX "device_security_policies_status_updated_idx"
  ON "device_security_policies"("tenant_id", "status", "updated_at");

ALTER TABLE "device_security_policies"
  ADD CONSTRAINT "device_security_policies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_security_policies"
  ADD CONSTRAINT "device_security_policies_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_security_policies"
  ADD CONSTRAINT "device_security_policies_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "device_security_policies"
  ADD CONSTRAINT "device_security_policies_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "device_security_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_security_policies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "device_security_policies_tenant_isolation" ON "device_security_policies"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_device_security_policy_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'device security policies cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "device_security_policies_no_delete"
BEFORE DELETE ON "device_security_policies"
FOR EACH ROW EXECUTE FUNCTION reject_device_security_policy_delete();
