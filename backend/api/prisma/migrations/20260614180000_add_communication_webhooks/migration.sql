CREATE TYPE "communication_webhook_processing_status" AS ENUM ('PROCESSED', 'IGNORED');

DROP INDEX "communication_attempts_provider_message_idx";
CREATE UNIQUE INDEX "communication_attempts_provider_message_key"
  ON "communication_attempts"("tenant_id", "provider_id", "provider_message_id");
CREATE INDEX "communication_attempts_provider_message_idx"
  ON "communication_attempts"("tenant_id", "provider_message_id");

CREATE TABLE "communication_webhooks" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "message_id" UUID,
  "attempt_id" UUID,
  "provider_event_id" VARCHAR(255) NOT NULL,
  "provider_message_id" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(80) NOT NULL,
  "processing_status" "communication_webhook_processing_status" NOT NULL,
  "error_code" VARCHAR(120),
  "event_metadata" JSONB,
  "signature_verified_at" TIMESTAMPTZ(3) NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "processed_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_webhooks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_webhooks_content_check"
    CHECK (
      length(btrim("provider_event_id")) > 0
      AND length(btrim("provider_message_id")) > 0
      AND length(btrim("event_type")) > 0
    )
);

CREATE UNIQUE INDEX "communication_webhooks_tenant_id_id_key"
  ON "communication_webhooks"("tenant_id", "id");
CREATE UNIQUE INDEX "communication_webhooks_event_key"
  ON "communication_webhooks"("tenant_id", "provider_id", "provider_event_id");
CREATE INDEX "communication_webhooks_message_idx"
  ON "communication_webhooks"("tenant_id", "provider_message_id", "created_at");
CREATE INDEX "communication_webhooks_status_idx"
  ON "communication_webhooks"("tenant_id", "processing_status", "created_at");

ALTER TABLE "communication_webhooks"
  ADD CONSTRAINT "communication_webhooks_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_webhooks"
  ADD CONSTRAINT "communication_webhooks_tenant_id_provider_id_fkey"
  FOREIGN KEY ("tenant_id", "provider_id") REFERENCES "communication_providers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_webhooks"
  ADD CONSTRAINT "communication_webhooks_tenant_id_message_id_fkey"
  FOREIGN KEY ("tenant_id", "message_id") REFERENCES "communication_messages"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_webhooks"
  ADD CONSTRAINT "communication_webhooks_tenant_id_attempt_id_fkey"
  FOREIGN KEY ("tenant_id", "attempt_id") REFERENCES "communication_attempts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_webhooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_webhooks" FORCE ROW LEVEL SECURITY;
CREATE POLICY "communication_webhooks_tenant_isolation" ON "communication_webhooks"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE TRIGGER "communication_webhooks_no_update"
BEFORE UPDATE ON "communication_webhooks"
FOR EACH ROW EXECUTE FUNCTION reject_communication_snapshot_mutation();
CREATE TRIGGER "communication_webhooks_no_delete"
BEFORE DELETE ON "communication_webhooks"
FOR EACH ROW EXECUTE FUNCTION reject_communication_history_delete();
