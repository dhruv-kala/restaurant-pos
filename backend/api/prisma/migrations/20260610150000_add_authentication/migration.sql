CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$$;

ALTER TABLE "user_accounts"
    ADD COLUMN "password_hash" VARCHAR(60);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(60) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_token_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_expiry_check"
        CHECK ("expires_at" > "created_at"),
    CONSTRAINT "refresh_tokens_revoked_at_check"
        CHECK ("revoked_at" IS NULL OR "revoked_at" >= "created_at"),
    CONSTRAINT "refresh_tokens_replacement_check"
        CHECK (
            ("replaced_by_token_id" IS NULL)
            OR (
                "revoked_at" IS NOT NULL
                AND "replaced_by_token_id" <> "id"
            )
        )
);

CREATE INDEX "refresh_tokens_user_id_revoked_at_idx"
    ON "refresh_tokens"("user_id", "revoked_at");
CREATE INDEX "refresh_tokens_expires_at_idx"
    ON "refresh_tokens"("expires_at");

ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

DROP POLICY "tenant_memberships_tenant_isolation" ON "tenant_memberships";

CREATE POLICY "tenant_memberships_tenant_or_user_isolation"
ON "tenant_memberships"
USING (
    "tenant_id" = app_current_tenant_id()
    OR "user_id" = app_current_user_id()
)
WITH CHECK (
    "tenant_id" = app_current_tenant_id()
);
