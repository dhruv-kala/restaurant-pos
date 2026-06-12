CREATE TYPE "audit_result" AS ENUM ('SUCCESS', 'DENIED', 'FAILED');
CREATE TYPE "audit_export_format" AS ENUM ('CSV', 'JSON');

CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "sequence" BIGSERIAL NOT NULL,
    "scope_key" VARCHAR(80) NOT NULL,
    "tenant_id" UUID,
    "outlet_id" UUID,
    "actor_user_id" UUID,
    "effective_user_id" UUID,
    "impersonator_user_id" UUID,
    "actor_roles" JSONB NOT NULL,
    "action" VARCHAR(160) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" VARCHAR(160),
    "result" "audit_result" NOT NULL DEFAULT 'SUCCESS',
    "reason" VARCHAR(500),
    "changes" JSONB,
    "metadata" JSONB,
    "correlation_id" VARCHAR(120),
    "idempotency_key" VARCHAR(160),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_hash" CHAR(64),
    "event_hash" CHAR(64) NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_events_scope_check"
      CHECK (
        ("tenant_id" IS NULL AND "scope_key" = 'PLATFORM' AND "outlet_id" IS NULL)
        OR
        ("tenant_id" IS NOT NULL AND "scope_key" = "tenant_id"::text)
      ),
    CONSTRAINT "audit_events_outlet_tenant_check"
      CHECK ("outlet_id" IS NULL OR "tenant_id" IS NOT NULL),
    CONSTRAINT "audit_events_hash_format_check"
      CHECK (
        "event_hash" ~ '^[0-9a-f]{64}$'
        AND ("previous_hash" IS NULL OR "previous_hash" ~ '^[0-9a-f]{64}$')
      )
);

CREATE UNIQUE INDEX "audit_events_sequence_key" ON "audit_events"("sequence");
CREATE UNIQUE INDEX "audit_events_event_hash_key" ON "audit_events"("event_hash");
CREATE UNIQUE INDEX "audit_events_tenant_id_id_key" ON "audit_events"("tenant_id", "id");
CREATE INDEX "audit_events_scope_sequence_idx" ON "audit_events"("scope_key", "sequence");
CREATE INDEX "audit_events_tenant_occurred_idx" ON "audit_events"("tenant_id", "occurred_at");
CREATE INDEX "audit_events_outlet_occurred_idx" ON "audit_events"("tenant_id", "outlet_id", "occurred_at");
CREATE INDEX "audit_events_actor_occurred_idx" ON "audit_events"("tenant_id", "actor_user_id", "occurred_at");
CREATE INDEX "audit_events_action_occurred_idx" ON "audit_events"("tenant_id", "action", "occurred_at");
CREATE INDEX "audit_events_target_occurred_idx" ON "audit_events"("tenant_id", "target_type", "target_id", "occurred_at");
CREATE INDEX "audit_events_correlation_idx" ON "audit_events"("correlation_id");

ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_effective_user_id_fkey"
  FOREIGN KEY ("effective_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_impersonator_user_id_fkey"
  FOREIGN KEY ("impersonator_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;

CREATE POLICY "audit_events_tenant_or_platform_isolation"
ON "audit_events"
USING (
  app_is_platform_admin()
  OR ("tenant_id" IS NOT NULL AND "tenant_id" = app_current_tenant_id())
)
WITH CHECK (
  app_is_platform_admin()
  OR ("tenant_id" IS NOT NULL AND "tenant_id" = app_current_tenant_id())
);

CREATE OR REPLACE FUNCTION reject_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit events are immutable';
END;
$$;

CREATE TRIGGER "audit_events_immutable_update"
BEFORE UPDATE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();

CREATE TRIGGER "audit_events_immutable_delete"
BEFORE DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();
