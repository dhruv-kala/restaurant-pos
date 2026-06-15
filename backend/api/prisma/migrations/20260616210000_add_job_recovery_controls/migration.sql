ALTER TYPE "background_job_status" ADD VALUE IF NOT EXISTS 'DEAD_LETTERED';

CREATE TYPE "job_dead_letter_status" AS ENUM (
  'OPEN',
  'RESOLVED'
);

CREATE TABLE "background_job_retry_policies" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "scope" "outbox_event_scope" NOT NULL,
  "scope_key" VARCHAR(80) NOT NULL,
  "tenant_id" UUID,
  "job_type" VARCHAR(160) NOT NULL,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "initial_delay_seconds" INTEGER NOT NULL DEFAULT 30,
  "max_delay_seconds" INTEGER NOT NULL DEFAULT 3600,
  "backoff_multiplier" INTEGER NOT NULL DEFAULT 2,
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "background_job_retry_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "background_job_retry_policies_scope_check"
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
  CONSTRAINT "background_job_retry_policies_text_check"
    CHECK (length(btrim("job_type")) > 0),
  CONSTRAINT "background_job_retry_policies_bounds_check"
    CHECK (
      "max_attempts" > 0
      AND "initial_delay_seconds" > 0
      AND "max_delay_seconds" >= "initial_delay_seconds"
      AND "backoff_multiplier" >= 1
      AND "version" > 0
    )
);

CREATE TABLE "job_dead_letters" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "scope" "outbox_event_scope" NOT NULL,
  "scope_key" VARCHAR(80) NOT NULL,
  "tenant_id" UUID,
  "outlet_id" UUID,
  "job_id" UUID NOT NULL,
  "status" "job_dead_letter_status" NOT NULL DEFAULT 'OPEN',
  "reason_code" VARCHAR(120) NOT NULL,
  "reason_message" VARCHAR(500),
  "failed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(3),
  "resolved_by_user_id" UUID,
  "resolution_note" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "job_dead_letters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_dead_letters_scope_check"
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
  CONSTRAINT "job_dead_letters_outlet_scope_check"
    CHECK ("outlet_id" IS NULL OR "tenant_id" IS NOT NULL),
  CONSTRAINT "job_dead_letters_text_check"
    CHECK (
      length(btrim("reason_code")) > 0
      AND ("reason_message" IS NULL OR length(btrim("reason_message")) > 0)
      AND ("resolution_note" IS NULL OR length(btrim("resolution_note")) > 0)
    ),
  CONSTRAINT "job_dead_letters_resolution_check"
    CHECK (
      (
        "status" = 'OPEN'
        AND "resolved_at" IS NULL
        AND "resolved_by_user_id" IS NULL
        AND "resolution_note" IS NULL
      )
      OR
      (
        "status" = 'RESOLVED'
        AND "resolved_at" IS NOT NULL
        AND "resolved_by_user_id" IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX "background_job_retry_policies_scope_type_key"
  ON "background_job_retry_policies"("scope_key", "job_type");
CREATE UNIQUE INDEX "background_job_retry_policies_tenant_id_id_key"
  ON "background_job_retry_policies"("tenant_id", "id");
CREATE INDEX "background_job_retry_policies_tenant_type_idx"
  ON "background_job_retry_policies"("tenant_id", "job_type");

CREATE UNIQUE INDEX "job_dead_letters_job_id_key"
  ON "job_dead_letters"("job_id");
CREATE UNIQUE INDEX "job_dead_letters_tenant_id_id_key"
  ON "job_dead_letters"("tenant_id", "id");
CREATE INDEX "job_dead_letters_scope_status_idx"
  ON "job_dead_letters"("tenant_id", "outlet_id", "status", "failed_at");
CREATE INDEX "job_dead_letters_status_idx"
  ON "job_dead_letters"("scope", "status", "failed_at");

ALTER TABLE "background_job_retry_policies"
  ADD CONSTRAINT "background_job_retry_policies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "background_job_retry_policies"
  ADD CONSTRAINT "background_job_retry_policies_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "background_job_retry_policies"
  ADD CONSTRAINT "background_job_retry_policies_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "job_dead_letters"
  ADD CONSTRAINT "job_dead_letters_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_dead_letters"
  ADD CONSTRAINT "job_dead_letters_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_dead_letters"
  ADD CONSTRAINT "job_dead_letters_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "background_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_dead_letters"
  ADD CONSTRAINT "job_dead_letters_resolved_by_user_id_fkey"
  FOREIGN KEY ("resolved_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "background_job_retry_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "background_job_retry_policies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "background_job_retry_policies_tenant_isolation" ON "background_job_retry_policies"
USING (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
)
WITH CHECK (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
);

ALTER TABLE "job_dead_letters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_dead_letters" FORCE ROW LEVEL SECURITY;
CREATE POLICY "job_dead_letters_tenant_isolation" ON "job_dead_letters"
USING (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
)
WITH CHECK (
  app_is_platform_admin()
  OR ("scope" = 'TENANT' AND "tenant_id" = app_current_tenant_id())
);

CREATE OR REPLACE FUNCTION reject_background_job_retry_policy_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'background job retry policies cannot be deleted';
END;
$$;

CREATE OR REPLACE FUNCTION reject_background_job_retry_policy_identity_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'background job retry policy identity is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION reject_job_dead_letter_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'job dead letters cannot be deleted';
END;
$$;

CREATE OR REPLACE FUNCTION reject_job_dead_letter_identity_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'job dead letter identity is immutable';
END;
$$;

CREATE TRIGGER "background_job_retry_policies_immutable_identity"
BEFORE UPDATE OF
  "scope",
  "scope_key",
  "tenant_id",
  "job_type",
  "created_by_user_id",
  "created_at"
ON "background_job_retry_policies"
FOR EACH ROW EXECUTE FUNCTION reject_background_job_retry_policy_identity_mutation();

CREATE TRIGGER "background_job_retry_policies_no_delete"
BEFORE DELETE ON "background_job_retry_policies"
FOR EACH ROW EXECUTE FUNCTION reject_background_job_retry_policy_delete();

CREATE TRIGGER "job_dead_letters_immutable_identity"
BEFORE UPDATE OF
  "scope",
  "scope_key",
  "tenant_id",
  "outlet_id",
  "job_id",
  "reason_code",
  "reason_message",
  "failed_at",
  "created_at"
ON "job_dead_letters"
FOR EACH ROW EXECUTE FUNCTION reject_job_dead_letter_identity_mutation();

CREATE TRIGGER "job_dead_letters_no_delete"
BEFORE DELETE ON "job_dead_letters"
FOR EACH ROW EXECUTE FUNCTION reject_job_dead_letter_delete();
