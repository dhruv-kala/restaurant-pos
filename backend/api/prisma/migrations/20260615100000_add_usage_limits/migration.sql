CREATE TYPE "usage_counter_period" AS ENUM (
    'LIFETIME',
    'DAILY',
    'MONTHLY'
);

CREATE TYPE "usage_limit_action" AS ENUM (
    'BLOCK',
    'WARN',
    'ALLOW'
);

CREATE TYPE "usage_counter_operation" AS ENUM (
    'CONSUME',
    'SET'
);

CREATE TABLE "usage_counters" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "feature_key" VARCHAR(120) NOT NULL,
    "period" "usage_counter_period" NOT NULL,
    "period_key" VARCHAR(40) NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3),
    "usage_value" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "usage_counters_value_check" CHECK ("usage_value" >= 0),
    CONSTRAINT "usage_counters_version_check" CHECK ("version" > 0),
    CONSTRAINT "usage_counters_period_check" CHECK (
        ("period" = 'LIFETIME' AND "period_key" = 'LIFETIME' AND "period_end" IS NULL)
        OR ("period" IN ('DAILY', 'MONTHLY')
            AND "period_end" IS NOT NULL
            AND "period_end" > "period_start")
    )
);

CREATE TABLE "usage_counter_events" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "counter_id" UUID NOT NULL,
    "feature_key" VARCHAR(120) NOT NULL,
    "operation" "usage_counter_operation" NOT NULL,
    "delta_value" BIGINT NOT NULL,
    "previous_value" BIGINT NOT NULL,
    "current_value" BIGINT NOT NULL,
    "limit_value" BIGINT,
    "limit_action" "usage_limit_action" NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "over_limit" BOOLEAN NOT NULL,
    "actor_user_id" UUID,
    "reason" VARCHAR(500),
    "idempotency_key" VARCHAR(160) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_counter_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "usage_counter_events_values_check" CHECK (
        "previous_value" >= 0
        AND "current_value" >= 0
        AND ("limit_value" IS NULL OR "limit_value" >= 0)
    )
);

CREATE UNIQUE INDEX "usage_counters_tenant_id_id_key"
    ON "usage_counters"("tenant_id", "id");
CREATE UNIQUE INDEX "usage_counters_tenant_feature_period_key"
    ON "usage_counters"("tenant_id", "feature_key", "period_key");
CREATE INDEX "usage_counters_feature_period_idx"
    ON "usage_counters"("tenant_id", "feature_key", "period_start");
CREATE UNIQUE INDEX "usage_counter_events_tenant_id_id_key"
    ON "usage_counter_events"("tenant_id", "id");
CREATE UNIQUE INDEX "usage_counter_events_idempotency_key"
    ON "usage_counter_events"("tenant_id", "idempotency_key");
CREATE INDEX "usage_counter_events_history_idx"
    ON "usage_counter_events"("tenant_id", "counter_id", "occurred_at");
CREATE INDEX "usage_counter_events_feature_idx"
    ON "usage_counter_events"("tenant_id", "feature_key");

ALTER TABLE "usage_counters"
    ADD CONSTRAINT "usage_counters_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_counter_events"
    ADD CONSTRAINT "usage_counter_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_counter_events"
    ADD CONSTRAINT "usage_counter_events_tenant_counter_fkey"
    FOREIGN KEY ("tenant_id", "counter_id")
    REFERENCES "usage_counters"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_counter_events"
    ADD CONSTRAINT "usage_counter_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "usage_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_counters" FORCE ROW LEVEL SECURITY;
CREATE POLICY "usage_counters_tenant_isolation"
ON "usage_counters"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "usage_counter_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_counter_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "usage_counter_events_tenant_isolation"
ON "usage_counter_events"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_usage_counter_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'usage counters cannot be deleted';
END;
$$;

CREATE TRIGGER "usage_counters_no_delete"
BEFORE DELETE ON "usage_counters"
FOR EACH ROW EXECUTE FUNCTION reject_usage_counter_delete();

CREATE OR REPLACE FUNCTION reject_usage_counter_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'usage counter history is append-only';
END;
$$;

CREATE TRIGGER "usage_counter_events_no_update"
BEFORE UPDATE ON "usage_counter_events"
FOR EACH ROW EXECUTE FUNCTION reject_usage_counter_event_mutation();

CREATE TRIGGER "usage_counter_events_no_delete"
BEFORE DELETE ON "usage_counter_events"
FOR EACH ROW EXECUTE FUNCTION reject_usage_counter_event_mutation();
