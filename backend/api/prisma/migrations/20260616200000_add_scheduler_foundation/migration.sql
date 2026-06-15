CREATE TYPE "scheduled_job_status" AS ENUM (
  'ACTIVE',
  'PAUSED',
  'DISABLED'
);

CREATE TYPE "scheduled_job_schedule_type" AS ENUM (
  'INTERVAL',
  'CRON'
);

CREATE TYPE "scheduled_job_run_status" AS ENUM (
  'CREATED',
  'SKIPPED',
  'FAILED'
);

CREATE TABLE "scheduled_jobs" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "scope" "outbox_event_scope" NOT NULL,
  "scope_key" VARCHAR(80) NOT NULL,
  "tenant_id" UUID,
  "outlet_id" UUID,
  "schedule_key" VARCHAR(120) NOT NULL,
  "display_name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "job_type" VARCHAR(160) NOT NULL,
  "payload" JSONB NOT NULL,
  "redacted_payload" JSONB,
  "status" "scheduled_job_status" NOT NULL DEFAULT 'ACTIVE',
  "schedule_type" "scheduled_job_schedule_type" NOT NULL,
  "cron_expression" VARCHAR(120),
  "interval_seconds" INTEGER,
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
  "next_run_at" TIMESTAMPTZ(3) NOT NULL,
  "last_run_at" TIMESTAMPTZ(3),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scheduled_jobs_scope_check"
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
  CONSTRAINT "scheduled_jobs_outlet_scope_check"
    CHECK ("outlet_id" IS NULL OR "tenant_id" IS NOT NULL),
  CONSTRAINT "scheduled_jobs_text_check"
    CHECK (
      length(btrim("schedule_key")) > 0
      AND length(btrim("display_name")) > 0
      AND length(btrim("job_type")) > 0
      AND length(btrim("timezone")) > 0
      AND ("description" IS NULL OR length(btrim("description")) > 0)
    ),
  CONSTRAINT "scheduled_jobs_schedule_shape_check"
    CHECK (
      (
        "schedule_type" = 'INTERVAL'
        AND "interval_seconds" IS NOT NULL
        AND "interval_seconds" > 0
        AND "cron_expression" IS NULL
      )
      OR
      (
        "schedule_type" = 'CRON'
        AND "cron_expression" IS NOT NULL
        AND length(btrim("cron_expression")) > 0
        AND "interval_seconds" IS NULL
      )
    ),
  CONSTRAINT "scheduled_jobs_version_check" CHECK ("version" > 0)
);

CREATE TABLE "scheduled_job_runs" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "scope" "outbox_event_scope" NOT NULL,
  "scope_key" VARCHAR(80) NOT NULL,
  "tenant_id" UUID,
  "outlet_id" UUID,
  "scheduled_job_id" UUID NOT NULL,
  "background_job_id" UUID,
  "due_at" TIMESTAMPTZ(3) NOT NULL,
  "triggered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "scheduled_job_run_status" NOT NULL DEFAULT 'CREATED',
  "idempotency_key" VARCHAR(180) NOT NULL,
  "failure_code" VARCHAR(120),
  "failure_message" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scheduled_job_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scheduled_job_runs_scope_check"
    CHECK (
      (
        "scope" = 'PLATFORM'
        AND "tenant_id" IS NULL
        AND "scope_key" = 'platform'
      )
      OR
      (
        "scope" = 'TENANT'
        AND "tenant_id" IS NOT NULL
        AND "scope_key" = "tenant_id"::text
      )
    ),
  CONSTRAINT "scheduled_job_runs_text_check"
    CHECK (length(btrim("idempotency_key")) > 0),
  CONSTRAINT "scheduled_job_runs_outlet_scope_check"
    CHECK ("outlet_id" IS NULL OR "tenant_id" IS NOT NULL),
  CONSTRAINT "scheduled_job_runs_failure_check"
    CHECK (
      "status" = 'FAILED'
      OR ("failure_code" IS NULL AND "failure_message" IS NULL)
    )
);

CREATE UNIQUE INDEX "scheduled_jobs_scope_schedule_key"
  ON "scheduled_jobs"("scope_key", "schedule_key");
CREATE UNIQUE INDEX "scheduled_jobs_tenant_id_id_key"
  ON "scheduled_jobs"("tenant_id", "id");
CREATE INDEX "scheduled_jobs_due_idx"
  ON "scheduled_jobs"("scope", "status", "next_run_at");
CREATE INDEX "scheduled_jobs_scope_status_idx"
  ON "scheduled_jobs"("tenant_id", "outlet_id", "status");

CREATE UNIQUE INDEX "scheduled_job_runs_job_due_key"
  ON "scheduled_job_runs"("scheduled_job_id", "due_at");
CREATE UNIQUE INDEX "scheduled_job_runs_scope_idempotency_key"
  ON "scheduled_job_runs"("scope_key", "idempotency_key");
CREATE UNIQUE INDEX "scheduled_job_runs_tenant_id_id_key"
  ON "scheduled_job_runs"("tenant_id", "id");
CREATE INDEX "scheduled_job_runs_history_idx"
  ON "scheduled_job_runs"("tenant_id", "scheduled_job_id", "due_at");
CREATE INDEX "scheduled_job_runs_outlet_due_idx"
  ON "scheduled_job_runs"("tenant_id", "outlet_id", "due_at");
CREATE INDEX "scheduled_job_runs_status_idx"
  ON "scheduled_job_runs"("scope", "status", "due_at");

ALTER TABLE "scheduled_jobs"
  ADD CONSTRAINT "scheduled_jobs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_jobs"
  ADD CONSTRAINT "scheduled_jobs_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_jobs"
  ADD CONSTRAINT "scheduled_jobs_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_jobs"
  ADD CONSTRAINT "scheduled_jobs_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scheduled_job_runs"
  ADD CONSTRAINT "scheduled_job_runs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_job_runs"
  ADD CONSTRAINT "scheduled_job_runs_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_job_runs"
  ADD CONSTRAINT "scheduled_job_runs_scheduled_job_id_fkey"
  FOREIGN KEY ("scheduled_job_id") REFERENCES "scheduled_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_job_runs"
  ADD CONSTRAINT "scheduled_job_runs_background_job_id_fkey"
  FOREIGN KEY ("background_job_id") REFERENCES "background_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scheduled_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_jobs_tenant_isolation" ON "scheduled_jobs"
USING (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
)
WITH CHECK (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
);

ALTER TABLE "scheduled_job_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_job_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_job_runs_tenant_isolation" ON "scheduled_job_runs"
USING (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
)
WITH CHECK (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
);

CREATE OR REPLACE FUNCTION reject_scheduled_job_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'scheduled jobs cannot be deleted';
END;
$$;

CREATE OR REPLACE FUNCTION reject_scheduled_job_identity_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'scheduled job identity and schedule are immutable';
END;
$$;

CREATE OR REPLACE FUNCTION reject_scheduled_job_run_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'scheduled job runs are append-only';
END;
$$;

CREATE OR REPLACE FUNCTION reject_scheduled_job_run_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'scheduled job runs are immutable';
END;
$$;

CREATE TRIGGER "scheduled_jobs_immutable_identity"
BEFORE UPDATE OF
  "scope",
  "scope_key",
  "tenant_id",
  "outlet_id",
  "schedule_key",
  "job_type",
  "payload",
  "redacted_payload",
  "schedule_type",
  "cron_expression",
  "interval_seconds",
  "timezone",
  "created_by_user_id",
  "created_at"
ON "scheduled_jobs"
FOR EACH ROW EXECUTE FUNCTION reject_scheduled_job_identity_mutation();

CREATE TRIGGER "scheduled_jobs_no_delete"
BEFORE DELETE ON "scheduled_jobs"
FOR EACH ROW EXECUTE FUNCTION reject_scheduled_job_delete();

CREATE TRIGGER "scheduled_job_runs_immutable"
BEFORE UPDATE ON "scheduled_job_runs"
FOR EACH ROW EXECUTE FUNCTION reject_scheduled_job_run_mutation();

CREATE TRIGGER "scheduled_job_runs_no_delete"
BEFORE DELETE ON "scheduled_job_runs"
FOR EACH ROW EXECUTE FUNCTION reject_scheduled_job_run_delete();
