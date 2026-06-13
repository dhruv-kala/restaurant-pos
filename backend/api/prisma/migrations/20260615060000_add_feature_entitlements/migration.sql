CREATE TABLE "tenant_entitlements" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "feature_key" VARCHAR(120) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "limit_value" INTEGER,
    "metadata" JSONB,
    "reason" VARCHAR(500) NOT NULL,
    "effective_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID NOT NULL,
    "last_idempotency_key" VARCHAR(160) NOT NULL,
    "last_request_fingerprint" CHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_entitlements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_entitlements_limit_check" CHECK (
        "limit_value" IS NULL OR "limit_value" >= 0
    ),
    CONSTRAINT "tenant_entitlements_period_check" CHECK (
        "effective_to" IS NULL OR "effective_to" > "effective_from"
    ),
    CONSTRAINT "tenant_entitlements_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "tenant_entitlements_tenant_id_id_key"
    ON "tenant_entitlements"("tenant_id", "id");
CREATE UNIQUE INDEX "tenant_entitlements_tenant_feature_key"
    ON "tenant_entitlements"("tenant_id", "feature_key");
CREATE UNIQUE INDEX "tenant_entitlements_idempotency_key"
    ON "tenant_entitlements"("tenant_id", "last_idempotency_key");
CREATE INDEX "tenant_entitlements_effective_idx"
    ON "tenant_entitlements"("tenant_id", "revoked_at", "effective_from", "effective_to");

ALTER TABLE "tenant_entitlements"
    ADD CONSTRAINT "tenant_entitlements_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_entitlements"
    ADD CONSTRAINT "tenant_entitlements_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_entitlements"
    ADD CONSTRAINT "tenant_entitlements_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_entitlements" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_entitlements_tenant_isolation"
ON "tenant_entitlements"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_tenant_entitlement_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tenant entitlements must be revoked instead of deleted';
END;
$$;

CREATE TRIGGER "tenant_entitlements_no_delete"
BEFORE DELETE ON "tenant_entitlements"
FOR EACH ROW EXECUTE FUNCTION reject_tenant_entitlement_delete();
