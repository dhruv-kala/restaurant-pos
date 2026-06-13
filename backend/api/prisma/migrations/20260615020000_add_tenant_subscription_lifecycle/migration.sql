CREATE TYPE "tenant_subscription_status" AS ENUM (
    'TRIAL',
    'ACTIVE',
    'SUSPENDED',
    'EXPIRED',
    'CANCELLED'
);

CREATE TYPE "tenant_subscription_event_type" AS ENUM (
    'ACTIVATED',
    'UPGRADED',
    'DOWNGRADED',
    'SUSPENDED',
    'RESUMED',
    'EXPIRED',
    'CANCELLED'
);

CREATE TABLE "tenant_subscriptions" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "tenant_subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3),
    "suspended_at" TIMESTAMPTZ(3),
    "expired_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_subscriptions_version_check" CHECK ("version" > 0),
    CONSTRAINT "tenant_subscriptions_period_check" CHECK (
        "ends_at" IS NULL OR "ends_at" > "starts_at"
    ),
    CONSTRAINT "tenant_subscriptions_status_timestamps_check" CHECK (
        ("status" IN ('ACTIVE', 'TRIAL')
            AND "suspended_at" IS NULL
            AND "expired_at" IS NULL
            AND "cancelled_at" IS NULL)
        OR ("status" = 'SUSPENDED'
            AND "suspended_at" IS NOT NULL
            AND "expired_at" IS NULL
            AND "cancelled_at" IS NULL)
        OR ("status" = 'EXPIRED'
            AND "expired_at" IS NOT NULL
            AND "cancelled_at" IS NULL)
        OR ("status" = 'CANCELLED'
            AND "cancelled_at" IS NOT NULL
            AND "expired_at" IS NULL)
    )
);

CREATE TABLE "tenant_subscription_events" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "event_type" "tenant_subscription_event_type" NOT NULL,
    "previous_status" "tenant_subscription_status",
    "new_status" "tenant_subscription_status" NOT NULL,
    "previous_plan_id" UUID,
    "new_plan_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "idempotency_key" VARCHAR(160) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_id_key"
    ON "tenant_subscriptions"("tenant_id", "id");
CREATE UNIQUE INDEX "tenant_subscriptions_one_current_key"
    ON "tenant_subscriptions"("tenant_id")
    WHERE "status" IN ('TRIAL', 'ACTIVE', 'SUSPENDED');
CREATE INDEX "tenant_subscriptions_directory_idx"
    ON "tenant_subscriptions"("tenant_id", "status", "updated_at");
CREATE INDEX "tenant_subscriptions_plan_idx"
    ON "tenant_subscriptions"("plan_id", "status");
CREATE UNIQUE INDEX "tenant_subscription_events_tenant_id_id_key"
    ON "tenant_subscription_events"("tenant_id", "id");
CREATE UNIQUE INDEX "tenant_subscription_events_idempotency_key"
    ON "tenant_subscription_events"("tenant_id", "idempotency_key");
CREATE INDEX "tenant_subscription_events_history_idx"
    ON "tenant_subscription_events"("tenant_id", "subscription_id", "occurred_at");
CREATE INDEX "tenant_subscription_events_type_idx"
    ON "tenant_subscription_events"("tenant_id", "event_type", "occurred_at");

ALTER TABLE "tenant_subscriptions"
    ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscriptions"
    ADD CONSTRAINT "tenant_subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscriptions"
    ADD CONSTRAINT "tenant_subscriptions_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscriptions"
    ADD CONSTRAINT "tenant_subscriptions_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_subscription_events"
    ADD CONSTRAINT "tenant_subscription_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscription_events"
    ADD CONSTRAINT "tenant_subscription_events_tenant_subscription_fkey"
    FOREIGN KEY ("tenant_id", "subscription_id")
    REFERENCES "tenant_subscriptions"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscription_events"
    ADD CONSTRAINT "tenant_subscription_events_previous_plan_id_fkey"
    FOREIGN KEY ("previous_plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscription_events"
    ADD CONSTRAINT "tenant_subscription_events_new_plan_id_fkey"
    FOREIGN KEY ("new_plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscription_events"
    ADD CONSTRAINT "tenant_subscription_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_subscriptions_tenant_isolation"
ON "tenant_subscriptions"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "tenant_subscription_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscription_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_subscription_events_tenant_isolation"
ON "tenant_subscription_events"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_tenant_subscription_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tenant subscriptions cannot be deleted';
END;
$$;

CREATE TRIGGER "tenant_subscriptions_no_delete"
BEFORE DELETE ON "tenant_subscriptions"
FOR EACH ROW EXECUTE FUNCTION reject_tenant_subscription_delete();

CREATE OR REPLACE FUNCTION reject_tenant_subscription_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tenant subscription history is append-only';
END;
$$;

CREATE TRIGGER "tenant_subscription_events_no_update"
BEFORE UPDATE ON "tenant_subscription_events"
FOR EACH ROW EXECUTE FUNCTION reject_tenant_subscription_event_mutation();

CREATE TRIGGER "tenant_subscription_events_no_delete"
BEFORE DELETE ON "tenant_subscription_events"
FOR EACH ROW EXECUTE FUNCTION reject_tenant_subscription_event_mutation();
