CREATE TYPE "communication_template_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

CREATE TABLE "communication_templates" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "template_key" VARCHAR(120) NOT NULL,
  "channel" "communication_channel" NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "status" "communication_template_status" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_templates_content_check"
    CHECK (
      length(btrim("template_key")) > 0
      AND length(btrim("name")) > 0
      AND "version" > 0
    )
);

CREATE TABLE "communication_template_versions" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "subject_template" VARCHAR(500),
  "body_template" TEXT NOT NULL,
  "variable_schema" JSONB NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_template_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_template_versions_content_check"
    CHECK (
      "version_number" > 0
      AND length(btrim("body_template")) > 0
      AND jsonb_typeof("variable_schema") = 'array'
    )
);

CREATE UNIQUE INDEX "communication_templates_tenant_id_id_key"
  ON "communication_templates"("tenant_id", "id");
CREATE UNIQUE INDEX "communication_templates_tenant_id_channel_template_key_key"
  ON "communication_templates"("tenant_id", "channel", "template_key");
CREATE INDEX "communication_templates_directory_idx"
  ON "communication_templates"("tenant_id", "status", "channel", "name");

CREATE UNIQUE INDEX "communication_template_versions_tenant_id_id_key"
  ON "communication_template_versions"("tenant_id", "id");
CREATE UNIQUE INDEX "communication_template_versions_tenant_id_template_id_id_key"
  ON "communication_template_versions"("tenant_id", "template_id", "id");
CREATE UNIQUE INDEX "communication_template_versions_tenant_id_template_id_version_number_key"
  ON "communication_template_versions"("tenant_id", "template_id", "version_number");
CREATE INDEX "communication_template_versions_history_idx"
  ON "communication_template_versions"("tenant_id", "template_id", "created_at");

ALTER TABLE "communication_messages"
  ADD COLUMN "template_id" UUID,
  ADD COLUMN "template_version_id" UUID,
  ADD CONSTRAINT "communication_messages_template_reference_check"
    CHECK (
      ("template_id" IS NULL AND "template_version_id" IS NULL)
      OR
      ("template_id" IS NOT NULL AND "template_version_id" IS NOT NULL)
    );

CREATE INDEX "communication_messages_template_version_idx"
  ON "communication_messages"("tenant_id", "template_version_id");

ALTER TABLE "communication_templates"
  ADD CONSTRAINT "communication_templates_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_template_versions"
  ADD CONSTRAINT "communication_template_versions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_template_versions"
  ADD CONSTRAINT "communication_template_versions_tenant_id_template_id_fkey"
  FOREIGN KEY ("tenant_id", "template_id") REFERENCES "communication_templates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_template_versions"
  ADD CONSTRAINT "communication_template_versions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages"
  ADD CONSTRAINT "communication_messages_tenant_id_template_id_fkey"
  FOREIGN KEY ("tenant_id", "template_id") REFERENCES "communication_templates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages"
  ADD CONSTRAINT "communication_messages_tenant_id_template_version_id_fkey"
  FOREIGN KEY ("tenant_id", "template_id", "template_version_id") REFERENCES "communication_template_versions"("tenant_id", "template_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_templates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "communication_templates_tenant_isolation" ON "communication_templates"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "communication_template_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_template_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "communication_template_versions_tenant_isolation" ON "communication_template_versions"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_communication_template_version_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'communication template versions are immutable';
END;
$$;

CREATE TRIGGER "communication_template_versions_immutable"
BEFORE UPDATE OR DELETE ON "communication_template_versions"
FOR EACH ROW EXECUTE FUNCTION reject_communication_template_version_mutation();

DROP TRIGGER "communication_messages_immutable_content" ON "communication_messages";
CREATE TRIGGER "communication_messages_immutable_content"
BEFORE UPDATE OF
  "tenant_id", "outlet_id", "notification_id", "template_id",
  "template_version_id", "channel", "recipient_type", "recipient_user_id",
  "recipient_reference_id", "recipient_address_ciphertext",
  "recipient_address_hash", "recipient_address_masked", "subject_snapshot",
  "body_snapshot", "locale", "idempotency_key", "request_fingerprint",
  "metadata", "created_at"
ON "communication_messages"
FOR EACH ROW EXECUTE FUNCTION reject_communication_snapshot_mutation();
