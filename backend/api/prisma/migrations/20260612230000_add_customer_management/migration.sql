CREATE TYPE "customer_gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE "customer_type" AS ENUM ('WALK_IN', 'REGULAR', 'VIP', 'CORPORATE', 'DELIVERY');
CREATE TYPE "customer_status" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');
CREATE TYPE "customer_source" AS ENUM (
  'POS', 'WAITER_APP', 'QR_ORDER', 'ONLINE_ORDER', 'CUSTOMER_APP', 'IMPORT'
);

CREATE TABLE "customers" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "first_name" VARCHAR(100),
  "last_name" VARCHAR(100),
  "display_name" VARCHAR(160) NOT NULL,
  "phone" VARCHAR(20),
  "email" CITEXT,
  "gender" "customer_gender",
  "date_of_birth" DATE,
  "anniversary_date" DATE,
  "gst_number" VARCHAR(32),
  "customer_type" "customer_type" NOT NULL DEFAULT 'WALK_IN',
  "status" "customer_status" NOT NULL DEFAULT 'ACTIVE',
  "notes" VARCHAR(1000),
  "source" "customer_source" NOT NULL DEFAULT 'POS',
  "sms_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "email_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customers_identity_check" CHECK (
    NULLIF(BTRIM("display_name"), '') IS NOT NULL
    AND ("phone" IS NOT NULL OR "email" IS NOT NULL OR "first_name" IS NOT NULL)
  )
);

CREATE TABLE "customer_addresses" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "label" VARCHAR(60) NOT NULL DEFAULT 'Other',
  "address_line_1" VARCHAR(200) NOT NULL,
  "address_line_2" VARCHAR(200),
  "city" VARCHAR(100),
  "state" VARCHAR(100),
  "country" VARCHAR(2),
  "postal_code" VARCHAR(20),
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_addresses_coordinates_check" CHECK (
    ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90))
    AND ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180))
  )
);

CREATE TABLE "customer_notes" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "note" VARCHAR(1000) NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_notes_note_check" CHECK (NULLIF(BTRIM("note"), '') IS NOT NULL)
);

CREATE TABLE "customer_visits" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "order_id" UUID,
  "bill_id" UUID,
  "payment_id" UUID,
  "visit_date" TIMESTAMPTZ(3) NOT NULL,
  "total_spend_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_visits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_visits_spend_check" CHECK ("total_spend_minor" >= 0),
  CONSTRAINT "customer_visits_reference_check" CHECK (
    "order_id" IS NOT NULL OR "bill_id" IS NOT NULL OR "payment_id" IS NOT NULL
  )
);

CREATE TABLE "customer_stats" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "total_orders" INTEGER NOT NULL DEFAULT 0,
  "total_spend_minor" INTEGER NOT NULL DEFAULT 0,
  "average_order_value_minor" INTEGER NOT NULL DEFAULT 0,
  "last_visit_at" TIMESTAMPTZ(3),
  "first_visit_at" TIMESTAMPTZ(3),
  "favorite_outlet_id" UUID,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "customer_stats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_stats_amounts_check" CHECK (
    "total_orders" >= 0 AND "total_spend_minor" >= 0 AND "average_order_value_minor" >= 0
  ),
  CONSTRAINT "customer_stats_dates_check" CHECK (
    "first_visit_at" IS NULL OR "last_visit_at" IS NULL OR "first_visit_at" <= "last_visit_at"
  )
);

CREATE UNIQUE INDEX "customers_tenant_id_id_key" ON "customers"("tenant_id", "id");
CREATE UNIQUE INDEX "customers_tenant_id_phone_key" ON "customers"("tenant_id", "phone");
CREATE UNIQUE INDEX "customers_tenant_id_email_key" ON "customers"("tenant_id", "email");
CREATE INDEX "customers_search_idx" ON "customers"("tenant_id", "display_name", "status", "deleted_at");
CREATE INDEX "customers_segment_idx" ON "customers"("tenant_id", "customer_type", "source", "created_at");

CREATE UNIQUE INDEX "customer_addresses_tenant_id_id_key" ON "customer_addresses"("tenant_id", "id");
CREATE INDEX "customer_addresses_customer_idx" ON "customer_addresses"("tenant_id", "customer_id", "is_default", "deleted_at");
CREATE UNIQUE INDEX "customer_addresses_one_default_key"
  ON "customer_addresses"("tenant_id", "customer_id")
  WHERE "is_default" = true AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX "customer_notes_tenant_id_id_key" ON "customer_notes"("tenant_id", "id");
CREATE INDEX "customer_notes_customer_idx" ON "customer_notes"("tenant_id", "customer_id", "created_at");

CREATE UNIQUE INDEX "customer_visits_tenant_id_id_key" ON "customer_visits"("tenant_id", "id");
CREATE UNIQUE INDEX "customer_visits_payment_key" ON "customer_visits"("tenant_id", "payment_id");
CREATE INDEX "customer_visits_customer_idx" ON "customer_visits"("tenant_id", "customer_id", "visit_date");
CREATE INDEX "customer_visits_outlet_idx" ON "customer_visits"("tenant_id", "outlet_id", "visit_date");

CREATE UNIQUE INDEX "customer_stats_tenant_id_id_key" ON "customer_stats"("tenant_id", "id");
CREATE UNIQUE INDEX "customer_stats_customer_key" ON "customer_stats"("tenant_id", "customer_id");
CREATE INDEX "customer_stats_favorite_outlet_idx" ON "customer_stats"("tenant_id", "favorite_outlet_id");

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_addresses"
  ADD CONSTRAINT "customer_addresses_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_addresses_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_notes"
  ADD CONSTRAINT "customer_notes_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_notes_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_notes_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_visits"
  ADD CONSTRAINT "customer_visits_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_visits_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_visits_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_visits_order_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_visits_bill_fkey" FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bills"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_visits_payment_fkey" FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "payments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_stats"
  ADD CONSTRAINT "customer_stats_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_stats_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_stats_favorite_outlet_fkey" FOREIGN KEY ("tenant_id", "favorite_outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_customer_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customers', 'customer_addresses', 'customer_notes', 'customer_visits', 'customer_stats'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (app_tenant_access_allowed(tenant_id)) WITH CHECK (app_tenant_access_allowed(tenant_id))',
      table_name || '_tenant_isolation', table_name
    );
  END LOOP;
END $$;
