CREATE TYPE "bill_payment_status" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');
CREATE TYPE "payment_method" AS ENUM ('CASH', 'UPI', 'CARD', 'WALLET', 'GIFT_CARD', 'BANK_TRANSFER');
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'PARTIALLY_PAID', 'REFUNDED', 'CANCELLED');
CREATE TYPE "refund_status" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');
CREATE TYPE "payment_source" AS ENUM ('POS', 'WAITER_APP', 'QR_ORDER', 'ONLINE_ORDER', 'CUSTOMER_APP');

ALTER TABLE "bills" ADD COLUMN "payment_status" "bill_payment_status" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "bills" ADD COLUMN "paid_amount_minor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN "refunded_amount_minor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN "outstanding_amount_minor" INTEGER NOT NULL DEFAULT 0;
UPDATE "bills" SET "outstanding_amount_minor" = "grand_total_minor";
ALTER TABLE "bills" ADD CONSTRAINT "bills_payment_amounts_check" CHECK (
  "paid_amount_minor" >= 0 AND "refunded_amount_minor" >= 0 AND
  "refunded_amount_minor" <= "paid_amount_minor" AND
  "outstanding_amount_minor" >= 0 AND
  "outstanding_amount_minor" = GREATEST("grand_total_minor" - ("paid_amount_minor" - "refunded_amount_minor"), 0)
);

CREATE TABLE "payment_number_counters" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payment_number_counters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_number_counters_last_number_check" CHECK ("last_number" > 0),
  CONSTRAINT "payment_number_counters_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "payment_number_counters_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "payment_number_counters_tenant_id_outlet_id_business_date_key"
  ON "payment_number_counters"("tenant_id", "outlet_id", "business_date");
CREATE INDEX "payment_number_counters_tenant_id_outlet_id_idx"
  ON "payment_number_counters"("tenant_id", "outlet_id");

CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "bill_id" UUID NOT NULL,
  "payment_number" VARCHAR(32) NOT NULL,
  "idempotency_key" VARCHAR(100) NOT NULL,
  "payment_method" "payment_method",
  "payment_source" "payment_source" NOT NULL DEFAULT 'POS',
  "status" "payment_status" NOT NULL DEFAULT 'PENDING',
  "amount_minor" INTEGER NOT NULL,
  "paid_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "refunded_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "reference_number" VARCHAR(120),
  "gateway_transaction_id" VARCHAR(160),
  "upi_transaction_id" VARCHAR(160),
  "payer_name" VARCHAR(160),
  "card_last4" CHAR(4),
  "approval_code" VARCHAR(80),
  "cash_received_minor" INTEGER,
  "change_returned_minor" INTEGER,
  "gateway_name" VARCHAR(80),
  "gateway_response" JSONB,
  "gateway_reference" VARCHAR(160),
  "device_id" VARCHAR(120),
  "terminal_id" VARCHAR(120),
  "shift_id" UUID,
  "business_date" DATE NOT NULL,
  "notes" VARCHAR(1000),
  "created_by_user_id" UUID NOT NULL,
  "paid_by_user_id" UUID,
  "paid_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_amounts_check" CHECK (
    "amount_minor" > 0 AND "paid_amount_minor" >= 0 AND
    "paid_amount_minor" <= "amount_minor" AND
    "refunded_amount_minor" >= 0 AND "refunded_amount_minor" <= "paid_amount_minor"
  ),
  CONSTRAINT "payments_cash_check" CHECK (
    "payment_method" <> 'CASH' OR
    ("cash_received_minor" IS NOT NULL AND "cash_received_minor" >= "amount_minor" AND
     "change_returned_minor" = "cash_received_minor" - "amount_minor")
  ),
  CONSTRAINT "payments_card_last4_check" CHECK ("card_last4" IS NULL OR "card_last4" ~ '^[0-9]{4}$'),
  CONSTRAINT "payments_success_audit_check" CHECK (
    ("status" IN ('SUCCESS', 'PARTIALLY_PAID', 'REFUNDED') AND "paid_at" IS NOT NULL AND "paid_by_user_id" IS NOT NULL) OR
    ("status" NOT IN ('SUCCESS', 'PARTIALLY_PAID', 'REFUNDED'))
  ),
  CONSTRAINT "payments_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "payments_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payments_bill_fkey" FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bills"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT,
  CONSTRAINT "payments_paid_by_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "payments_tenant_id_id_key" ON "payments"("tenant_id", "id");
CREATE UNIQUE INDEX "payments_tenant_id_outlet_id_payment_number_key"
  ON "payments"("tenant_id", "outlet_id", "payment_number");
CREATE UNIQUE INDEX "payments_tenant_id_outlet_id_idempotency_key_key"
  ON "payments"("tenant_id", "outlet_id", "idempotency_key");
CREATE INDEX "payments_tenant_id_outlet_id_status_business_date_idx"
  ON "payments"("tenant_id", "outlet_id", "status", "business_date");
CREATE INDEX "payments_tenant_id_bill_id_status_idx" ON "payments"("tenant_id", "bill_id", "status");
CREATE INDEX "payments_tenant_id_reference_number_idx" ON "payments"("tenant_id", "reference_number");

CREATE TABLE "payment_transactions" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "payment_method" "payment_method" NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "reference_number" VARCHAR(120),
  "gateway_transaction_id" VARCHAR(160),
  "upi_transaction_id" VARCHAR(160),
  "payer_name" VARCHAR(160),
  "card_last4" CHAR(4),
  "approval_code" VARCHAR(80),
  "cash_received_minor" INTEGER,
  "change_returned_minor" INTEGER,
  "gateway_name" VARCHAR(80),
  "gateway_response" JSONB,
  "gateway_reference" VARCHAR(160),
  "status" "payment_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_transactions_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "payment_transactions_cash_check" CHECK (
    "payment_method" <> 'CASH' OR
    ("cash_received_minor" IS NOT NULL AND "cash_received_minor" >= "amount_minor" AND
     "change_returned_minor" = "cash_received_minor" - "amount_minor")
  ),
  CONSTRAINT "payment_transactions_card_last4_check" CHECK ("card_last4" IS NULL OR "card_last4" ~ '^[0-9]{4}$'),
  CONSTRAINT "payment_transactions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "payment_transactions_payment_fkey" FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "payments"("tenant_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "payment_transactions_tenant_id_id_key" ON "payment_transactions"("tenant_id", "id");
CREATE INDEX "payment_transactions_tenant_id_payment_id_status_idx"
  ON "payment_transactions"("tenant_id", "payment_id", "status");

CREATE TABLE "payment_refunds" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "refund_number" VARCHAR(48) NOT NULL,
  "idempotency_key" VARCHAR(100) NOT NULL,
  "refund_amount_minor" INTEGER NOT NULL,
  "refund_reason" VARCHAR(500) NOT NULL,
  "status" "refund_status" NOT NULL DEFAULT 'COMPLETED',
  "refunded_by_user_id" UUID NOT NULL,
  "refunded_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_refunds_amount_check" CHECK ("refund_amount_minor" > 0),
  CONSTRAINT "payment_refunds_completion_check" CHECK (
    ("status" = 'COMPLETED' AND "refunded_at" IS NOT NULL) OR ("status" <> 'COMPLETED')
  ),
  CONSTRAINT "payment_refunds_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "payment_refunds_payment_fkey" FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "payments"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payment_refunds_user_fkey" FOREIGN KEY ("refunded_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "payment_refunds_tenant_id_id_key" ON "payment_refunds"("tenant_id", "id");
CREATE UNIQUE INDEX "payment_refunds_tenant_id_refund_number_key"
  ON "payment_refunds"("tenant_id", "refund_number");
CREATE UNIQUE INDEX "payment_refunds_tenant_id_payment_id_idempotency_key_key"
  ON "payment_refunds"("tenant_id", "payment_id", "idempotency_key");
CREATE INDEX "payment_refunds_tenant_id_payment_id_status_idx"
  ON "payment_refunds"("tenant_id", "payment_id", "status");

ALTER TABLE "payment_number_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_number_counters" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payment_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_transactions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payment_refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_refunds" FORCE ROW LEVEL SECURITY;

CREATE POLICY "payment_number_counters_tenant_isolation" ON "payment_number_counters"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
CREATE POLICY "payments_tenant_isolation" ON "payments"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
CREATE POLICY "payment_transactions_tenant_isolation" ON "payment_transactions"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
CREATE POLICY "payment_refunds_tenant_isolation" ON "payment_refunds"
  USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
  WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
