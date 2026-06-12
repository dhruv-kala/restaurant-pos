CREATE TYPE "communication_channel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH');
CREATE TYPE "communication_provider_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "communication_recipient_type" AS ENUM ('USER', 'CUSTOMER', 'EXTERNAL');
CREATE TYPE "communication_message_status" AS ENUM (
  'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'
);
CREATE TYPE "communication_attempt_status" AS ENUM (
  'PENDING', 'PROCESSING', 'ACCEPTED', 'DELIVERED',
  'RETRYABLE_FAILED', 'TERMINAL_FAILED'
);

CREATE TABLE "communication_providers" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "channel" "communication_channel" NOT NULL,
  "provider_key" VARCHAR(80) NOT NULL,
  "display_name" VARCHAR(160) NOT NULL,
  "status" "communication_provider_status" NOT NULL DEFAULT 'INACTIVE',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "secret_reference" VARCHAR(255),
  "config_metadata" JSONB,
  "capabilities" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "communication_providers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_providers_priority_check" CHECK ("priority" >= 0),
  CONSTRAINT "communication_providers_version_check" CHECK ("version" > 0)
);

CREATE TABLE "communication_messages" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "notification_id" UUID,
  "provider_id" UUID,
  "channel" "communication_channel" NOT NULL,
  "recipient_type" "communication_recipient_type" NOT NULL,
  "recipient_user_id" UUID,
  "recipient_reference_id" UUID,
  "recipient_address_ciphertext" TEXT NOT NULL,
  "recipient_address_hash" CHAR(64) NOT NULL,
  "recipient_address_masked" VARCHAR(255) NOT NULL,
  "subject_snapshot" VARCHAR(500),
  "body_snapshot" TEXT NOT NULL,
  "locale" VARCHAR(35) NOT NULL DEFAULT 'en',
  "status" "communication_message_status" NOT NULL DEFAULT 'QUEUED',
  "idempotency_key" VARCHAR(160) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "metadata" JSONB,
  "scheduled_at" TIMESTAMPTZ(3),
  "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processing_started_at" TIMESTAMPTZ(3),
  "sent_at" TIMESTAMPTZ(3),
  "delivered_at" TIMESTAMPTZ(3),
  "failed_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_messages_hash_check"
    CHECK (
      "recipient_address_hash" ~ '^[0-9a-f]{64}$'
      AND "request_fingerprint" ~ '^[0-9a-f]{64}$'
    ),
  CONSTRAINT "communication_messages_content_check"
    CHECK (
      length(btrim("recipient_address_ciphertext")) > 0
      AND length(btrim("recipient_address_masked")) > 0
      AND length(btrim("body_snapshot")) > 0
      AND length(btrim("idempotency_key")) > 0
    ),
  CONSTRAINT "communication_messages_user_recipient_check"
    CHECK (
      ("recipient_type" = 'USER' AND "recipient_user_id" IS NOT NULL)
      OR
      ("recipient_type" <> 'USER' AND "recipient_user_id" IS NULL)
    ),
  CONSTRAINT "communication_messages_customer_reference_check"
    CHECK ("recipient_type" <> 'CUSTOMER' OR "recipient_reference_id" IS NOT NULL),
  CONSTRAINT "communication_messages_schedule_check"
    CHECK ("scheduled_at" IS NULL OR "available_at" >= "scheduled_at")
);

CREATE TABLE "communication_attempts" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "status" "communication_attempt_status" NOT NULL DEFAULT 'PENDING',
  "provider_message_id" VARCHAR(255),
  "error_code" VARCHAR(120),
  "error_classification" VARCHAR(80),
  "request_metadata" JSONB,
  "response_metadata" JSONB,
  "started_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "next_retry_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "communication_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_attempts_number_check" CHECK ("attempt_number" > 0),
  CONSTRAINT "communication_attempts_completion_check"
    CHECK ("completed_at" IS NULL OR "started_at" IS NOT NULL),
  CONSTRAINT "communication_attempts_retry_check"
    CHECK ("next_retry_at" IS NULL OR "status" = 'RETRYABLE_FAILED')
);

CREATE UNIQUE INDEX "communication_providers_tenant_id_id_key"
  ON "communication_providers"("tenant_id", "id");
CREATE UNIQUE INDEX "communication_providers_tenant_id_channel_provider_key_key"
  ON "communication_providers"("tenant_id", "channel", "provider_key");
CREATE INDEX "communication_providers_selection_idx"
  ON "communication_providers"("tenant_id", "channel", "status", "priority");

CREATE UNIQUE INDEX "communication_messages_tenant_id_id_key"
  ON "communication_messages"("tenant_id", "id");
CREATE UNIQUE INDEX "communication_messages_tenant_id_channel_idempotency_key_key"
  ON "communication_messages"("tenant_id", "channel", "idempotency_key");
CREATE INDEX "communication_messages_queue_idx"
  ON "communication_messages"("tenant_id", "status", "available_at");
CREATE INDEX "communication_messages_outlet_created_idx"
  ON "communication_messages"("tenant_id", "outlet_id", "created_at");
CREATE INDEX "communication_messages_notification_idx"
  ON "communication_messages"("tenant_id", "notification_id");
CREATE INDEX "communication_messages_recipient_idx"
  ON "communication_messages"("tenant_id", "recipient_address_hash", "created_at");

CREATE UNIQUE INDEX "communication_attempts_tenant_id_id_key"
  ON "communication_attempts"("tenant_id", "id");
CREATE UNIQUE INDEX "communication_attempts_tenant_id_message_id_attempt_number_key"
  ON "communication_attempts"("tenant_id", "message_id", "attempt_number");
CREATE INDEX "communication_attempts_retry_idx"
  ON "communication_attempts"("tenant_id", "status", "next_retry_at");
CREATE INDEX "communication_attempts_provider_idx"
  ON "communication_attempts"("tenant_id", "provider_id", "created_at");

ALTER TABLE "communication_providers"
  ADD CONSTRAINT "communication_providers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages"
  ADD CONSTRAINT "communication_messages_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages"
  ADD CONSTRAINT "communication_messages_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages"
  ADD CONSTRAINT "communication_messages_tenant_id_notification_id_fkey"
  FOREIGN KEY ("tenant_id", "notification_id") REFERENCES "notifications"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages"
  ADD CONSTRAINT "communication_messages_tenant_id_provider_id_fkey"
  FOREIGN KEY ("tenant_id", "provider_id") REFERENCES "communication_providers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages"
  ADD CONSTRAINT "communication_messages_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_attempts"
  ADD CONSTRAINT "communication_attempts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_attempts"
  ADD CONSTRAINT "communication_attempts_tenant_id_message_id_fkey"
  FOREIGN KEY ("tenant_id", "message_id") REFERENCES "communication_messages"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_attempts"
  ADD CONSTRAINT "communication_attempts_tenant_id_provider_id_fkey"
  FOREIGN KEY ("tenant_id", "provider_id") REFERENCES "communication_providers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_providers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "communication_providers_tenant_isolation" ON "communication_providers"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "communication_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY "communication_messages_tenant_isolation" ON "communication_messages"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "communication_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_attempts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "communication_attempts_tenant_isolation" ON "communication_attempts"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_communication_history_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'communication history is append-only';
END;
$$;

CREATE OR REPLACE FUNCTION reject_communication_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'communication snapshots are immutable';
END;
$$;

CREATE TRIGGER "communication_messages_immutable_content"
BEFORE UPDATE OF
  "tenant_id", "outlet_id", "notification_id", "channel", "recipient_type",
  "recipient_user_id", "recipient_reference_id", "recipient_address_ciphertext",
  "recipient_address_hash", "recipient_address_masked", "subject_snapshot",
  "body_snapshot", "locale", "idempotency_key", "request_fingerprint",
  "metadata", "created_at"
ON "communication_messages"
FOR EACH ROW EXECUTE FUNCTION reject_communication_snapshot_mutation();
CREATE TRIGGER "communication_messages_no_delete"
BEFORE DELETE ON "communication_messages"
FOR EACH ROW EXECUTE FUNCTION reject_communication_history_delete();

CREATE TRIGGER "communication_attempts_immutable_identity"
BEFORE UPDATE OF
  "tenant_id", "message_id", "provider_id", "attempt_number",
  "request_metadata", "created_at"
ON "communication_attempts"
FOR EACH ROW EXECUTE FUNCTION reject_communication_snapshot_mutation();
CREATE TRIGGER "communication_attempts_no_delete"
BEFORE DELETE ON "communication_attempts"
FOR EACH ROW EXECUTE FUNCTION reject_communication_history_delete();
