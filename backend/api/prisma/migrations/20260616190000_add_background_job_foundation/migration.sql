CREATE TYPE "background_job_status" AS ENUM (
  'PENDING',
  'PROCESSING',
  'RETRYING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "background_job_attempt_status" AS ENUM (
  'STARTED',
  'SUCCEEDED',
  'RETRYABLE_FAILED',
  'TERMINAL_FAILED'
);

CREATE TABLE "background_jobs" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "scope" "outbox_event_scope" NOT NULL,
  "scope_key" VARCHAR(80) NOT NULL,
  "tenant_id" UUID,
  "outlet_id" UUID,
  "outbox_event_id" UUID,
  "job_type" VARCHAR(160) NOT NULL,
  "aggregate_type" VARCHAR(100),
  "aggregate_id" VARCHAR(160),
  "idempotency_key" VARCHAR(180) NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "payload" JSONB NOT NULL,
  "redacted_payload" JSONB,
  "status" "background_job_status" NOT NULL DEFAULT 'PENDING',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_by" VARCHAR(120),
  "locked_until" TIMESTAMPTZ(3),
  "last_error_code" VARCHAR(120),
  "last_error_message" VARCHAR(500),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "background_jobs_scope_check"
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
  CONSTRAINT "background_jobs_outlet_scope_check"
    CHECK ("outlet_id" IS NULL OR "tenant_id" IS NOT NULL),
  CONSTRAINT "background_jobs_text_check"
    CHECK (
      length(btrim("job_type")) > 0
      AND length(btrim("idempotency_key")) > 0
      AND ("aggregate_type" IS NULL OR length(btrim("aggregate_type")) > 0)
      AND ("aggregate_id" IS NULL OR length(btrim("aggregate_id")) > 0)
    ),
  CONSTRAINT "background_jobs_fingerprint_check"
    CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "background_jobs_attempts_check"
    CHECK ("attempt_count" >= 0 AND "max_attempts" > 0 AND "attempt_count" <= "max_attempts"),
  CONSTRAINT "background_jobs_priority_check"
    CHECK ("priority" >= 0),
  CONSTRAINT "background_jobs_lock_check"
    CHECK (
      ("status" = 'PROCESSING' AND "locked_by" IS NOT NULL AND "locked_until" IS NOT NULL)
      OR
      ("status" <> 'PROCESSING')
    )
);

CREATE TABLE "background_job_attempts" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "scope" "outbox_event_scope" NOT NULL,
  "scope_key" VARCHAR(80) NOT NULL,
  "tenant_id" UUID,
  "job_id" UUID NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "worker_id" VARCHAR(120) NOT NULL,
  "status" "background_job_attempt_status" NOT NULL DEFAULT 'STARTED',
  "error_code" VARCHAR(120),
  "error_classification" VARCHAR(80),
  "error_message" VARCHAR(500),
  "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "background_job_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "background_job_attempts_scope_check"
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
  CONSTRAINT "background_job_attempts_number_check" CHECK ("attempt_number" > 0),
  CONSTRAINT "background_job_attempts_completion_check"
    CHECK ("completed_at" IS NULL OR "status" <> 'STARTED'),
  CONSTRAINT "background_job_attempts_error_check"
    CHECK (
      "status" IN ('RETRYABLE_FAILED', 'TERMINAL_FAILED')
      OR ("error_code" IS NULL AND "error_classification" IS NULL AND "error_message" IS NULL)
    )
);

CREATE UNIQUE INDEX "background_jobs_scope_type_idempotency_key"
  ON "background_jobs"("scope_key", "job_type", "idempotency_key");
CREATE UNIQUE INDEX "background_jobs_tenant_id_id_key"
  ON "background_jobs"("tenant_id", "id");
CREATE INDEX "background_jobs_tenant_queue_idx"
  ON "background_jobs"("tenant_id", "status", "available_at");
CREATE INDEX "background_jobs_scope_queue_idx"
  ON "background_jobs"("scope", "status", "available_at", "priority");
CREATE INDEX "background_jobs_outlet_created_idx"
  ON "background_jobs"("tenant_id", "outlet_id", "created_at");
CREATE INDEX "background_jobs_aggregate_idx"
  ON "background_jobs"("scope_key", "aggregate_type", "aggregate_id", "created_at");
CREATE INDEX "background_jobs_outbox_event_idx"
  ON "background_jobs"("outbox_event_id");

CREATE UNIQUE INDEX "background_job_attempts_job_attempt_key"
  ON "background_job_attempts"("job_id", "attempt_number");
CREATE UNIQUE INDEX "background_job_attempts_tenant_id_id_key"
  ON "background_job_attempts"("tenant_id", "id");
CREATE INDEX "background_job_attempts_job_history_idx"
  ON "background_job_attempts"("tenant_id", "job_id", "started_at");
CREATE INDEX "background_job_attempts_status_idx"
  ON "background_job_attempts"("scope", "status", "started_at");

ALTER TABLE "background_jobs"
  ADD CONSTRAINT "background_jobs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "background_jobs"
  ADD CONSTRAINT "background_jobs_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "background_jobs"
  ADD CONSTRAINT "background_jobs_outbox_event_id_fkey"
  FOREIGN KEY ("outbox_event_id") REFERENCES "outbox_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "background_jobs"
  ADD CONSTRAINT "background_jobs_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "background_job_attempts"
  ADD CONSTRAINT "background_job_attempts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "background_job_attempts"
  ADD CONSTRAINT "background_job_attempts_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "background_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "background_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "background_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "background_jobs_tenant_isolation" ON "background_jobs"
USING (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
)
WITH CHECK (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
);

ALTER TABLE "background_job_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "background_job_attempts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "background_job_attempts_tenant_isolation" ON "background_job_attempts"
USING (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
)
WITH CHECK (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
);

CREATE OR REPLACE FUNCTION reject_background_job_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'background jobs cannot be deleted';
END;
$$;

CREATE OR REPLACE FUNCTION reject_background_job_identity_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'background job identity and payload are immutable';
END;
$$;

CREATE OR REPLACE FUNCTION reject_background_job_attempt_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'background job attempts are append-only';
END;
$$;

CREATE OR REPLACE FUNCTION reject_background_job_attempt_identity_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'background job attempt identity is immutable';
END;
$$;

CREATE TRIGGER "background_jobs_immutable_identity"
BEFORE UPDATE OF
  "scope",
  "scope_key",
  "tenant_id",
  "outlet_id",
  "outbox_event_id",
  "job_type",
  "aggregate_type",
  "aggregate_id",
  "idempotency_key",
  "request_fingerprint",
  "payload",
  "redacted_payload",
  "created_by_user_id",
  "created_at"
ON "background_jobs"
FOR EACH ROW EXECUTE FUNCTION reject_background_job_identity_mutation();

CREATE TRIGGER "background_jobs_no_delete"
BEFORE DELETE ON "background_jobs"
FOR EACH ROW EXECUTE FUNCTION reject_background_job_delete();

CREATE TRIGGER "background_job_attempts_immutable_identity"
BEFORE UPDATE OF
  "scope",
  "scope_key",
  "tenant_id",
  "job_id",
  "attempt_number",
  "worker_id",
  "created_at"
ON "background_job_attempts"
FOR EACH ROW EXECUTE FUNCTION reject_background_job_attempt_identity_mutation();

CREATE TRIGGER "background_job_attempts_no_delete"
BEFORE DELETE ON "background_job_attempts"
FOR EACH ROW EXECUTE FUNCTION reject_background_job_attempt_delete();
