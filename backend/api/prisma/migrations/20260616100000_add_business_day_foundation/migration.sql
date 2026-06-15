CREATE TYPE "business_day_status" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "shift_session_status" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "cash_drawer_status" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "cash_drawer_transaction_type" AS ENUM ('OPENING_BALANCE', 'CASH_IN', 'CASH_OUT', 'ADJUSTMENT', 'CLOSING_BALANCE');

CREATE TABLE "business_days" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "status" "business_day_status" NOT NULL DEFAULT 'OPEN',
  "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ(3),
  "opened_by_user_id" UUID NOT NULL,
  "closed_by_user_id" UUID,
  "opening_notes" VARCHAR(1000),
  "closing_notes" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "business_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_days_version_check" CHECK ("version" > 0),
  CONSTRAINT "business_days_closed_fields_check" CHECK (
    ("status" = 'OPEN' AND "closed_at" IS NULL AND "closed_by_user_id" IS NULL)
    OR
    ("status" = 'CLOSED' AND "closed_at" IS NOT NULL AND "closed_by_user_id" IS NOT NULL)
  ),
  CONSTRAINT "business_days_close_after_open_check" CHECK (
    "closed_at" IS NULL OR "closed_at" >= "opened_at"
  )
);

CREATE UNIQUE INDEX "business_days_tenant_id_id_key"
  ON "business_days"("tenant_id", "id");
CREATE UNIQUE INDEX "business_days_outlet_date_key"
  ON "business_days"("tenant_id", "outlet_id", "business_date");
CREATE UNIQUE INDEX "business_days_one_open_per_outlet_key"
  ON "business_days"("tenant_id", "outlet_id")
  WHERE "status" = 'OPEN';
CREATE INDEX "business_days_current_idx"
  ON "business_days"("tenant_id", "outlet_id", "status");
CREATE INDEX "business_days_reporting_idx"
  ON "business_days"("tenant_id", "business_date", "outlet_id", "status");

ALTER TABLE "business_days"
  ADD CONSTRAINT "business_days_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_days"
  ADD CONSTRAINT "business_days_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_days"
  ADD CONSTRAINT "business_days_opened_by_user_id_fkey"
  FOREIGN KEY ("opened_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_days"
  ADD CONSTRAINT "business_days_closed_by_user_id_fkey"
  FOREIGN KEY ("closed_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "business_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_days" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_days_tenant_isolation" ON "business_days"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_closed_business_day_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'business days cannot be deleted';
  END IF;
  IF OLD."status" = 'CLOSED' THEN
    RAISE EXCEPTION 'closed business days are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "business_days_no_closed_update"
BEFORE UPDATE ON "business_days"
FOR EACH ROW EXECUTE FUNCTION reject_closed_business_day_mutation();

CREATE TRIGGER "business_days_no_delete"
BEFORE DELETE ON "business_days"
FOR EACH ROW EXECUTE FUNCTION reject_closed_business_day_mutation();

CREATE TABLE "shift_sessions" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_day_id" UUID NOT NULL,
  "assigned_user_id" UUID NOT NULL,
  "shift_id" UUID,
  "status" "shift_session_status" NOT NULL DEFAULT 'OPEN',
  "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ(3),
  "opened_by_user_id" UUID NOT NULL,
  "closed_by_user_id" UUID,
  "opening_notes" VARCHAR(1000),
  "closing_notes" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "shift_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shift_sessions_version_check" CHECK ("version" > 0),
  CONSTRAINT "shift_sessions_closed_fields_check" CHECK (
    ("status" = 'OPEN' AND "closed_at" IS NULL AND "closed_by_user_id" IS NULL)
    OR
    ("status" = 'CLOSED' AND "closed_at" IS NOT NULL AND "closed_by_user_id" IS NOT NULL)
  ),
  CONSTRAINT "shift_sessions_close_after_open_check" CHECK (
    "closed_at" IS NULL OR "closed_at" >= "opened_at"
  )
);

CREATE UNIQUE INDEX "shift_sessions_tenant_id_id_key"
  ON "shift_sessions"("tenant_id", "id");
CREATE UNIQUE INDEX "shift_sessions_one_open_per_user_key"
  ON "shift_sessions"("tenant_id", "assigned_user_id")
  WHERE "status" = 'OPEN';
CREATE INDEX "shift_sessions_business_day_idx"
  ON "shift_sessions"("tenant_id", "outlet_id", "business_day_id", "status");
CREATE INDEX "shift_sessions_user_status_idx"
  ON "shift_sessions"("tenant_id", "assigned_user_id", "status");
CREATE INDEX "shift_sessions_shift_status_idx"
  ON "shift_sessions"("tenant_id", "shift_id", "status");

ALTER TABLE "shift_sessions"
  ADD CONSTRAINT "shift_sessions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_sessions"
  ADD CONSTRAINT "shift_sessions_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_sessions"
  ADD CONSTRAINT "shift_sessions_business_day_id_fkey"
  FOREIGN KEY ("tenant_id", "business_day_id") REFERENCES "business_days"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_sessions"
  ADD CONSTRAINT "shift_sessions_shift_id_fkey"
  FOREIGN KEY ("tenant_id", "shift_id") REFERENCES "shifts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_sessions"
  ADD CONSTRAINT "shift_sessions_assigned_user_id_fkey"
  FOREIGN KEY ("assigned_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_sessions"
  ADD CONSTRAINT "shift_sessions_opened_by_user_id_fkey"
  FOREIGN KEY ("opened_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_sessions"
  ADD CONSTRAINT "shift_sessions_closed_by_user_id_fkey"
  FOREIGN KEY ("closed_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_sessions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "shift_sessions_tenant_isolation" ON "shift_sessions"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_closed_shift_session_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'shift sessions cannot be deleted';
  END IF;
  IF OLD."status" = 'CLOSED' THEN
    RAISE EXCEPTION 'closed shift sessions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "shift_sessions_no_closed_update"
BEFORE UPDATE ON "shift_sessions"
FOR EACH ROW EXECUTE FUNCTION reject_closed_shift_session_mutation();

CREATE TRIGGER "shift_sessions_no_delete"
BEFORE DELETE ON "shift_sessions"
FOR EACH ROW EXECUTE FUNCTION reject_closed_shift_session_mutation();

CREATE TABLE "cash_drawers" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_day_id" UUID NOT NULL,
  "shift_session_id" UUID NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "status" "cash_drawer_status" NOT NULL DEFAULT 'OPEN',
  "opening_balance_minor" INTEGER NOT NULL,
  "expected_cash_minor" INTEGER NOT NULL DEFAULT 0,
  "closing_balance_minor" INTEGER,
  "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ(3),
  "opened_by_user_id" UUID NOT NULL,
  "closed_by_user_id" UUID,
  "opening_notes" VARCHAR(1000),
  "closing_notes" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "cash_drawers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cash_drawers_currency_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "cash_drawers_amounts_check" CHECK (
    "opening_balance_minor" >= 0
    AND "expected_cash_minor" >= 0
    AND ("closing_balance_minor" IS NULL OR "closing_balance_minor" >= 0)
  ),
  CONSTRAINT "cash_drawers_closed_fields_check" CHECK (
    ("status" = 'OPEN' AND "closed_at" IS NULL AND "closed_by_user_id" IS NULL AND "closing_balance_minor" IS NULL)
    OR
    ("status" = 'CLOSED' AND "closed_at" IS NOT NULL AND "closed_by_user_id" IS NOT NULL AND "closing_balance_minor" IS NOT NULL)
  ),
  CONSTRAINT "cash_drawers_close_after_open_check" CHECK (
    "closed_at" IS NULL OR "closed_at" >= "opened_at"
  ),
  CONSTRAINT "cash_drawers_version_check" CHECK ("version" > 0)
);

CREATE TABLE "cash_drawer_transactions" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_day_id" UUID NOT NULL,
  "cash_drawer_id" UUID NOT NULL,
  "transaction_type" "cash_drawer_transaction_type" NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "balance_after_minor" INTEGER NOT NULL,
  "note" VARCHAR(1000),
  "recorded_by_user_id" UUID NOT NULL,
  "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cash_drawer_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cash_drawer_transactions_amount_check" CHECK ("amount_minor" >= 0 AND "balance_after_minor" >= 0)
);

CREATE TABLE "shift_reconciliations" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_day_id" UUID NOT NULL,
  "shift_session_id" UUID NOT NULL,
  "cash_drawer_id" UUID NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "expected_cash_minor" INTEGER NOT NULL,
  "counted_cash_minor" INTEGER NOT NULL,
  "variance_minor" INTEGER NOT NULL,
  "approval_notes" VARCHAR(1000),
  "reconciled_by_user_id" UUID NOT NULL,
  "reconciled_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shift_reconciliations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shift_reconciliations_currency_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "shift_reconciliations_amounts_check" CHECK (
    "expected_cash_minor" >= 0
    AND "counted_cash_minor" >= 0
    AND "variance_minor" = "counted_cash_minor" - "expected_cash_minor"
  )
);

CREATE UNIQUE INDEX "cash_drawers_tenant_id_id_key"
  ON "cash_drawers"("tenant_id", "id");
CREATE UNIQUE INDEX "cash_drawers_one_open_per_shift_key"
  ON "cash_drawers"("tenant_id", "shift_session_id")
  WHERE "status" = 'OPEN';
CREATE INDEX "cash_drawers_business_day_idx"
  ON "cash_drawers"("tenant_id", "outlet_id", "business_day_id", "status");
CREATE INDEX "cash_drawers_shift_status_idx"
  ON "cash_drawers"("tenant_id", "shift_session_id", "status");

CREATE UNIQUE INDEX "cash_drawer_transactions_tenant_id_id_key"
  ON "cash_drawer_transactions"("tenant_id", "id");
CREATE INDEX "cash_drawer_transactions_drawer_idx"
  ON "cash_drawer_transactions"("tenant_id", "cash_drawer_id", "recorded_at");
CREATE INDEX "cash_drawer_transactions_reporting_idx"
  ON "cash_drawer_transactions"("tenant_id", "business_day_id", "outlet_id", "transaction_type");

CREATE UNIQUE INDEX "shift_reconciliations_tenant_id_id_key"
  ON "shift_reconciliations"("tenant_id", "id");
CREATE UNIQUE INDEX "shift_reconciliations_shift_session_key"
  ON "shift_reconciliations"("tenant_id", "shift_session_id");
CREATE UNIQUE INDEX "shift_reconciliations_cash_drawer_key"
  ON "shift_reconciliations"("tenant_id", "cash_drawer_id");
CREATE INDEX "shift_reconciliations_reporting_idx"
  ON "shift_reconciliations"("tenant_id", "outlet_id", "business_day_id", "reconciled_at");

ALTER TABLE "cash_drawers"
  ADD CONSTRAINT "cash_drawers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawers"
  ADD CONSTRAINT "cash_drawers_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawers"
  ADD CONSTRAINT "cash_drawers_business_day_id_fkey"
  FOREIGN KEY ("tenant_id", "business_day_id") REFERENCES "business_days"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawers"
  ADD CONSTRAINT "cash_drawers_shift_session_id_fkey"
  FOREIGN KEY ("tenant_id", "shift_session_id") REFERENCES "shift_sessions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawers"
  ADD CONSTRAINT "cash_drawers_opened_by_user_id_fkey"
  FOREIGN KEY ("opened_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawers"
  ADD CONSTRAINT "cash_drawers_closed_by_user_id_fkey"
  FOREIGN KEY ("closed_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cash_drawer_transactions"
  ADD CONSTRAINT "cash_drawer_transactions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawer_transactions"
  ADD CONSTRAINT "cash_drawer_transactions_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawer_transactions"
  ADD CONSTRAINT "cash_drawer_transactions_business_day_id_fkey"
  FOREIGN KEY ("tenant_id", "business_day_id") REFERENCES "business_days"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawer_transactions"
  ADD CONSTRAINT "cash_drawer_transactions_cash_drawer_id_fkey"
  FOREIGN KEY ("tenant_id", "cash_drawer_id") REFERENCES "cash_drawers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_drawer_transactions"
  ADD CONSTRAINT "cash_drawer_transactions_recorded_by_user_id_fkey"
  FOREIGN KEY ("recorded_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_reconciliations"
  ADD CONSTRAINT "shift_reconciliations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_reconciliations"
  ADD CONSTRAINT "shift_reconciliations_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_reconciliations"
  ADD CONSTRAINT "shift_reconciliations_business_day_id_fkey"
  FOREIGN KEY ("tenant_id", "business_day_id") REFERENCES "business_days"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_reconciliations"
  ADD CONSTRAINT "shift_reconciliations_shift_session_id_fkey"
  FOREIGN KEY ("tenant_id", "shift_session_id") REFERENCES "shift_sessions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_reconciliations"
  ADD CONSTRAINT "shift_reconciliations_cash_drawer_id_fkey"
  FOREIGN KEY ("tenant_id", "cash_drawer_id") REFERENCES "cash_drawers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_reconciliations"
  ADD CONSTRAINT "shift_reconciliations_reconciled_by_user_id_fkey"
  FOREIGN KEY ("reconciled_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cash_drawers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_drawers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "cash_drawers_tenant_isolation" ON "cash_drawers"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "cash_drawer_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_drawer_transactions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "cash_drawer_transactions_tenant_isolation" ON "cash_drawer_transactions"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "shift_reconciliations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_reconciliations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "shift_reconciliations_tenant_isolation" ON "shift_reconciliations"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_closed_cash_drawer_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'cash drawers cannot be deleted';
  END IF;
  IF OLD."status" = 'CLOSED' THEN
    RAISE EXCEPTION 'closed cash drawers are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "cash_drawers_no_closed_update"
BEFORE UPDATE ON "cash_drawers"
FOR EACH ROW EXECUTE FUNCTION reject_closed_cash_drawer_mutation();

CREATE TRIGGER "cash_drawers_no_delete"
BEFORE DELETE ON "cash_drawers"
FOR EACH ROW EXECUTE FUNCTION reject_closed_cash_drawer_mutation();

CREATE OR REPLACE FUNCTION reject_cash_drawer_transaction_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'cash drawer transactions are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "cash_drawer_transactions_no_update"
BEFORE UPDATE ON "cash_drawer_transactions"
FOR EACH ROW EXECUTE FUNCTION reject_cash_drawer_transaction_mutation();

CREATE TRIGGER "cash_drawer_transactions_no_delete"
BEFORE DELETE ON "cash_drawer_transactions"
FOR EACH ROW EXECUTE FUNCTION reject_cash_drawer_transaction_mutation();

CREATE OR REPLACE FUNCTION reject_shift_reconciliation_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'shift reconciliations are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "shift_reconciliations_no_update"
BEFORE UPDATE ON "shift_reconciliations"
FOR EACH ROW EXECUTE FUNCTION reject_shift_reconciliation_mutation();

CREATE TRIGGER "shift_reconciliations_no_delete"
BEFORE DELETE ON "shift_reconciliations"
FOR EACH ROW EXECUTE FUNCTION reject_shift_reconciliation_mutation();
