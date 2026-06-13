ALTER TYPE "tenant_subscription_event_type" ADD VALUE 'TRIAL_STARTED';
ALTER TYPE "tenant_subscription_event_type" ADD VALUE 'TRIAL_EXTENDED';
ALTER TYPE "tenant_subscription_event_type" ADD VALUE 'TRIAL_EXPIRED';
ALTER TYPE "tenant_subscription_event_type" ADD VALUE 'TRIAL_CONVERTED';

CREATE TYPE "trial_subscription_status" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'CONVERTED'
);

CREATE TYPE "trial_subscription_event_type" AS ENUM (
    'STARTED',
    'EXTENDED',
    'EXPIRED',
    'CONVERTED'
);

CREATE TABLE "trial_subscriptions" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "converted_plan_id" UUID,
    "status" "trial_subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "extended_count" INTEGER NOT NULL DEFAULT 0,
    "expired_at" TIMESTAMPTZ(3),
    "converted_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trial_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trial_subscriptions_period_check" CHECK ("ends_at" > "starts_at"),
    CONSTRAINT "trial_subscriptions_extended_count_check" CHECK ("extended_count" >= 0),
    CONSTRAINT "trial_subscriptions_version_check" CHECK ("version" > 0),
    CONSTRAINT "trial_subscriptions_status_timestamps_check" CHECK (
        ("status" = 'ACTIVE' AND "expired_at" IS NULL AND "converted_at" IS NULL)
        OR ("status" = 'EXPIRED' AND "expired_at" IS NOT NULL AND "converted_at" IS NULL)
        OR ("status" = 'CONVERTED' AND "converted_at" IS NOT NULL AND "expired_at" IS NULL AND "converted_plan_id" IS NOT NULL)
    )
);

CREATE TABLE "trial_subscription_events" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "trial_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "event_type" "trial_subscription_event_type" NOT NULL,
    "previous_status" "trial_subscription_status",
    "new_status" "trial_subscription_status" NOT NULL,
    "previous_ends_at" TIMESTAMPTZ(3),
    "new_ends_at" TIMESTAMPTZ(3) NOT NULL,
    "previous_plan_id" UUID,
    "new_plan_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "idempotency_key" VARCHAR(160) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trial_subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trial_subscriptions_tenant_id_id_key"
    ON "trial_subscriptions"("tenant_id", "id");
CREATE UNIQUE INDEX "trial_subscriptions_tenant_subscription_key"
    ON "trial_subscriptions"("tenant_id", "subscription_id");
CREATE UNIQUE INDEX "trial_subscriptions_one_per_tenant_key"
    ON "trial_subscriptions"("tenant_id");
CREATE UNIQUE INDEX "trial_subscriptions_one_active_key"
    ON "trial_subscriptions"("tenant_id")
    WHERE "status" = 'ACTIVE';
CREATE INDEX "trial_subscriptions_status_due_idx"
    ON "trial_subscriptions"("tenant_id", "status", "ends_at");
CREATE UNIQUE INDEX "trial_subscription_events_tenant_id_id_key"
    ON "trial_subscription_events"("tenant_id", "id");
CREATE UNIQUE INDEX "trial_subscription_events_idempotency_key"
    ON "trial_subscription_events"("tenant_id", "idempotency_key");
CREATE INDEX "trial_subscription_events_history_idx"
    ON "trial_subscription_events"("tenant_id", "trial_id", "occurred_at");
CREATE INDEX "trial_subscription_events_type_idx"
    ON "trial_subscription_events"("tenant_id", "event_type", "occurred_at");

ALTER TABLE "trial_subscriptions"
    ADD CONSTRAINT "trial_subscriptions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscriptions"
    ADD CONSTRAINT "trial_subscriptions_tenant_subscription_fkey"
    FOREIGN KEY ("tenant_id", "subscription_id")
    REFERENCES "tenant_subscriptions"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscriptions"
    ADD CONSTRAINT "trial_subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscriptions"
    ADD CONSTRAINT "trial_subscriptions_converted_plan_id_fkey"
    FOREIGN KEY ("converted_plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscriptions"
    ADD CONSTRAINT "trial_subscriptions_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscriptions"
    ADD CONSTRAINT "trial_subscriptions_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "trial_subscription_events"
    ADD CONSTRAINT "trial_subscription_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscription_events"
    ADD CONSTRAINT "trial_subscription_events_tenant_trial_fkey"
    FOREIGN KEY ("tenant_id", "trial_id")
    REFERENCES "trial_subscriptions"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscription_events"
    ADD CONSTRAINT "trial_subscription_events_tenant_subscription_fkey"
    FOREIGN KEY ("tenant_id", "subscription_id")
    REFERENCES "tenant_subscriptions"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscription_events"
    ADD CONSTRAINT "trial_subscription_events_previous_plan_id_fkey"
    FOREIGN KEY ("previous_plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscription_events"
    ADD CONSTRAINT "trial_subscription_events_new_plan_id_fkey"
    FOREIGN KEY ("new_plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trial_subscription_events"
    ADD CONSTRAINT "trial_subscription_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "trial_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trial_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "trial_subscriptions_tenant_isolation"
ON "trial_subscriptions"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "trial_subscription_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trial_subscription_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "trial_subscription_events_tenant_isolation"
ON "trial_subscription_events"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_trial_subscription_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'trial subscriptions cannot be deleted';
END;
$$;

CREATE TRIGGER "trial_subscriptions_no_delete"
BEFORE DELETE ON "trial_subscriptions"
FOR EACH ROW EXECUTE FUNCTION reject_trial_subscription_delete();

CREATE OR REPLACE FUNCTION reject_trial_subscription_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'trial subscription history is append-only';
END;
$$;

CREATE TRIGGER "trial_subscription_events_no_update"
BEFORE UPDATE ON "trial_subscription_events"
FOR EACH ROW EXECUTE FUNCTION reject_trial_subscription_event_mutation();

CREATE TRIGGER "trial_subscription_events_no_delete"
BEFORE DELETE ON "trial_subscription_events"
FOR EACH ROW EXECUTE FUNCTION reject_trial_subscription_event_mutation();
