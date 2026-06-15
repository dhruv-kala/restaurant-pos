CREATE TYPE "trusted_session_status" AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'REVOKED'
);

CREATE TABLE "trusted_sessions" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "device_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "trusted_session_status" NOT NULL DEFAULT 'ACTIVE',
  "session_token_hash" CHAR(64) NOT NULL,
  "session_token_masked" VARCHAR(32) NOT NULL,
  "trusted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_renewed_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  "revoked_by_user_id" UUID,
  "revocation_reason" VARCHAR(500),
  "user_agent" VARCHAR(500),
  "ip_address" VARCHAR(64),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "trusted_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trusted_sessions_version_check" CHECK ("version" > 0),
  CONSTRAINT "trusted_sessions_expiry_check" CHECK ("expires_at" > "trusted_at"),
  CONSTRAINT "trusted_sessions_renewal_check" CHECK (
    "last_renewed_at" IS NULL OR "last_renewed_at" >= "trusted_at"
  ),
  CONSTRAINT "trusted_sessions_revocation_check" CHECK (
    ("status" <> 'REVOKED' AND "revoked_at" IS NULL AND "revoked_by_user_id" IS NULL)
    OR
    ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL AND "revoked_by_user_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "trusted_sessions_tenant_id_id_key"
  ON "trusted_sessions"("tenant_id", "id");
CREATE UNIQUE INDEX "trusted_sessions_one_active_per_device_user_key"
  ON "trusted_sessions"("tenant_id", "device_id", "user_id")
  WHERE "status" = 'ACTIVE';
CREATE INDEX "trusted_sessions_device_status_idx"
  ON "trusted_sessions"("tenant_id", "device_id", "status");
CREATE INDEX "trusted_sessions_user_status_idx"
  ON "trusted_sessions"("tenant_id", "user_id", "status");
CREATE INDEX "trusted_sessions_status_expiry_idx"
  ON "trusted_sessions"("tenant_id", "status", "expires_at");
CREATE INDEX "trusted_sessions_token_lookup_idx"
  ON "trusted_sessions"("tenant_id", "session_token_hash", "status", "expires_at");

ALTER TABLE "trusted_sessions"
  ADD CONSTRAINT "trusted_sessions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trusted_sessions"
  ADD CONSTRAINT "trusted_sessions_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trusted_sessions"
  ADD CONSTRAINT "trusted_sessions_device_id_fkey"
  FOREIGN KEY ("tenant_id", "device_id") REFERENCES "devices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trusted_sessions"
  ADD CONSTRAINT "trusted_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trusted_sessions"
  ADD CONSTRAINT "trusted_sessions_revoked_by_user_id_fkey"
  FOREIGN KEY ("revoked_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "trusted_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trusted_sessions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "trusted_sessions_tenant_isolation" ON "trusted_sessions"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_trusted_session_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'trusted sessions cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trusted_sessions_no_delete"
BEFORE DELETE ON "trusted_sessions"
FOR EACH ROW EXECUTE FUNCTION reject_trusted_session_delete();
