CREATE TYPE "outbox_event_scope" AS ENUM ('PLATFORM', 'TENANT');
CREATE TYPE "outbox_event_status" AS ENUM (
  'PENDING',
  'PROCESSING',
  'PROCESSED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "scope" "outbox_event_scope" NOT NULL,
  "scope_key" VARCHAR(80) NOT NULL,
  "tenant_id" UUID,
  "outlet_id" UUID,
  "event_type" VARCHAR(160) NOT NULL,
  "aggregate_type" VARCHAR(100),
  "aggregate_id" VARCHAR(160),
  "idempotency_key" VARCHAR(180) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "payload" JSONB NOT NULL,
  "redacted_payload" JSONB,
  "status" "outbox_event_status" NOT NULL DEFAULT 'PENDING',
  "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(3),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_events_scope_check"
    CHECK (
      (
        "scope" = 'PLATFORM'
        AND "tenant_id" IS NULL
        AND "outlet_id" IS NULL
        AND "scope_key" = 'platform'
      )
      OR
      (
        "scope" = 'TENANT'
        AND "tenant_id" IS NOT NULL
        AND "scope_key" = "tenant_id"::text
      )
    ),
  CONSTRAINT "outbox_events_outlet_scope_check"
    CHECK ("outlet_id" IS NULL OR "tenant_id" IS NOT NULL),
  CONSTRAINT "outbox_events_text_check"
    CHECK (
      length(btrim("event_type")) > 0
      AND length(btrim("idempotency_key")) > 0
      AND ("aggregate_type" IS NULL OR length(btrim("aggregate_type")) > 0)
      AND ("aggregate_id" IS NULL OR length(btrim("aggregate_id")) > 0)
    ),
  CONSTRAINT "outbox_events_fingerprint_check"
    CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "outbox_events_processed_status_check"
    CHECK ("processed_at" IS NULL OR "status" IN ('PROCESSED', 'FAILED', 'CANCELLED'))
);

CREATE UNIQUE INDEX "outbox_events_scope_event_idempotency_key"
  ON "outbox_events"("scope_key", "event_type", "idempotency_key");
CREATE UNIQUE INDEX "outbox_events_tenant_id_id_key"
  ON "outbox_events"("tenant_id", "id");
CREATE INDEX "outbox_events_tenant_queue_idx"
  ON "outbox_events"("tenant_id", "status", "available_at");
CREATE INDEX "outbox_events_scope_queue_idx"
  ON "outbox_events"("scope", "status", "available_at");
CREATE INDEX "outbox_events_outlet_created_idx"
  ON "outbox_events"("tenant_id", "outlet_id", "created_at");
CREATE INDEX "outbox_events_aggregate_idx"
  ON "outbox_events"("scope_key", "aggregate_type", "aggregate_id", "created_at");

ALTER TABLE "outbox_events"
  ADD CONSTRAINT "outbox_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outbox_events"
  ADD CONSTRAINT "outbox_events_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outbox_events"
  ADD CONSTRAINT "outbox_events_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outbox_events_tenant_isolation" ON "outbox_events"
USING (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
)
WITH CHECK (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
);

CREATE OR REPLACE FUNCTION reject_outbox_event_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'outbox events are append-only';
END;
$$;

CREATE OR REPLACE FUNCTION reject_outbox_event_identity_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'outbox event identity and payload are immutable';
END;
$$;

CREATE TRIGGER "outbox_events_immutable_identity"
BEFORE UPDATE OF
  "scope",
  "scope_key",
  "tenant_id",
  "outlet_id",
  "event_type",
  "aggregate_type",
  "aggregate_id",
  "idempotency_key",
  "request_fingerprint",
  "payload",
  "redacted_payload",
  "created_by_user_id",
  "created_at"
ON "outbox_events"
FOR EACH ROW EXECUTE FUNCTION reject_outbox_event_identity_mutation();

CREATE TRIGGER "outbox_events_no_delete"
BEFORE DELETE ON "outbox_events"
FOR EACH ROW EXECUTE FUNCTION reject_outbox_event_delete();
