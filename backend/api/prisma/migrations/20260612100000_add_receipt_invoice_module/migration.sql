CREATE TYPE "receipt_type" AS ENUM (
  'CUSTOMER_RECEIPT',
  'TAX_INVOICE',
  'DUPLICATE_COPY',
  'PROFORMA_INVOICE'
);

CREATE TYPE "receipt_status" AS ENUM (
  'GENERATED',
  'PRINTED',
  'REPRINTED',
  'VOID'
);

CREATE TYPE "printer_type" AS ENUM (
  'THERMAL_58MM',
  'THERMAL_80MM',
  'BLUETOOTH',
  'USB',
  'NETWORK',
  'PDF',
  'MOCK'
);

CREATE TABLE "receipt_number_counters" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "receipt_number_counters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "receipt_number_counters_last_number_check" CHECK ("last_number" > 0)
);

CREATE TABLE "invoice_number_counters" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "invoice_number_counters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_number_counters_last_number_check" CHECK ("last_number" > 0)
);

CREATE TABLE "receipts" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "bill_id" UUID NOT NULL,
  "payment_id" UUID,
  "receipt_number" VARCHAR(32) NOT NULL,
  "invoice_number" VARCHAR(32),
  "receipt_type" "receipt_type" NOT NULL DEFAULT 'CUSTOMER_RECEIPT',
  "status" "receipt_status" NOT NULL DEFAULT 'GENERATED',
  "printable_payload" JSONB NOT NULL,
  "verification_code" VARCHAR(64) NOT NULL,
  "qr_payload" VARCHAR(1000) NOT NULL,
  "print_count" INTEGER NOT NULL DEFAULT 0,
  "last_printed_at" TIMESTAMPTZ(3),
  "pdf_url" VARCHAR(2048),
  "generated_by_user_id" UUID NOT NULL,
  "generated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "receipts_print_count_check" CHECK ("print_count" >= 0),
  CONSTRAINT "receipts_invoice_type_check" CHECK (
    "receipt_type" <> 'TAX_INVOICE' OR "invoice_number" IS NOT NULL
  )
);

CREATE TABLE "receipt_print_logs" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "receipt_id" UUID NOT NULL,
  "printed_by_user_id" UUID NOT NULL,
  "printer_name" VARCHAR(160) NOT NULL,
  "printer_type" "printer_type" NOT NULL,
  "copies" INTEGER NOT NULL DEFAULT 1,
  "is_reprint" BOOLEAN NOT NULL DEFAULT false,
  "printed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receipt_print_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "receipt_print_logs_copies_check" CHECK ("copies" BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX "receipt_number_counters_tenant_id_outlet_id_business_date_key"
  ON "receipt_number_counters"("tenant_id", "outlet_id", "business_date");
CREATE INDEX "receipt_number_counters_tenant_id_outlet_id_idx"
  ON "receipt_number_counters"("tenant_id", "outlet_id");
CREATE UNIQUE INDEX "invoice_number_counters_tenant_id_outlet_id_business_date_key"
  ON "invoice_number_counters"("tenant_id", "outlet_id", "business_date");
CREATE INDEX "invoice_number_counters_tenant_id_outlet_id_idx"
  ON "invoice_number_counters"("tenant_id", "outlet_id");
CREATE UNIQUE INDEX "receipts_tenant_id_id_key" ON "receipts"("tenant_id", "id");
CREATE UNIQUE INDEX "receipts_tenant_id_outlet_id_receipt_number_key"
  ON "receipts"("tenant_id", "outlet_id", "receipt_number");
CREATE UNIQUE INDEX "receipts_tenant_id_outlet_id_invoice_number_key"
  ON "receipts"("tenant_id", "outlet_id", "invoice_number");
CREATE INDEX "receipts_tenant_id_outlet_id_status_generated_at_idx"
  ON "receipts"("tenant_id", "outlet_id", "status", "generated_at");
CREATE INDEX "receipts_tenant_id_bill_id_receipt_type_idx"
  ON "receipts"("tenant_id", "bill_id", "receipt_type");
CREATE INDEX "receipts_tenant_id_payment_id_idx"
  ON "receipts"("tenant_id", "payment_id");
CREATE UNIQUE INDEX "receipt_print_logs_tenant_id_id_key"
  ON "receipt_print_logs"("tenant_id", "id");
CREATE INDEX "receipt_print_logs_tenant_id_receipt_id_printed_at_idx"
  ON "receipt_print_logs"("tenant_id", "receipt_id", "printed_at");
CREATE INDEX "receipt_print_logs_tenant_id_outlet_id_printed_at_idx"
  ON "receipt_print_logs"("tenant_id", "outlet_id", "printed_at");

ALTER TABLE "receipt_number_counters"
  ADD CONSTRAINT "receipt_number_counters_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "receipt_number_counters_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_number_counters"
  ADD CONSTRAINT "invoice_number_counters_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "invoice_number_counters_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts"
  ADD CONSTRAINT "receipts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "receipts_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "receipts_tenant_id_bill_id_fkey"
  FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bills"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "receipts_tenant_id_payment_id_fkey"
  FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "payments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "receipts_generated_by_user_id_fkey"
  FOREIGN KEY ("generated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipt_print_logs"
  ADD CONSTRAINT "receipt_print_logs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "receipt_print_logs_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "receipt_print_logs_tenant_id_receipt_id_fkey"
  FOREIGN KEY ("tenant_id", "receipt_id") REFERENCES "receipts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "receipt_print_logs_printed_by_user_id_fkey"
  FOREIGN KEY ("printed_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "receipt_number_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipt_number_counters" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_receipt_number_counters ON "receipt_number_counters"
  USING (app_tenant_access_allowed("tenant_id"))
  WITH CHECK (app_tenant_access_allowed("tenant_id"));

ALTER TABLE "invoice_number_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_number_counters" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_invoice_number_counters ON "invoice_number_counters"
  USING (app_tenant_access_allowed("tenant_id"))
  WITH CHECK (app_tenant_access_allowed("tenant_id"));

ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_receipts ON "receipts"
  USING (app_tenant_access_allowed("tenant_id"))
  WITH CHECK (app_tenant_access_allowed("tenant_id"));

ALTER TABLE "receipt_print_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipt_print_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_receipt_print_logs ON "receipt_print_logs"
  USING (app_tenant_access_allowed("tenant_id"))
  WITH CHECK (app_tenant_access_allowed("tenant_id"));
