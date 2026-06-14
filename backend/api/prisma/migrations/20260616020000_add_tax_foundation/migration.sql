CREATE TYPE "tax_profile_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "tax_type" AS ENUM ('GST', 'VAT', 'SERVICE_TAX', 'ZERO_RATED', 'EXEMPT');
CREATE TYPE "tax_mode" AS ENUM ('INCLUSIVE', 'EXCLUSIVE', 'EXEMPT', 'ZERO_RATED');

CREATE TABLE "tax_profiles" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "tax_type" "tax_type" NOT NULL,
  "tax_mode" "tax_mode" NOT NULL,
  "country_code" CHAR(2) NOT NULL DEFAULT 'IN',
  "currency_code" CHAR(3) NOT NULL DEFAULT 'INR',
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "status" "tax_profile_status" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tax_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_profiles_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_-]*$'),
  CONSTRAINT "tax_profiles_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "tax_profiles_country_code_check" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "tax_profiles_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "tax_profiles_version_check" CHECK ("version" > 0),
  CONSTRAINT "tax_profiles_default_active_check" CHECK (
    "is_default" = false OR "status" = 'ACTIVE'
  ),
  CONSTRAINT "tax_profiles_exempt_mode_check" CHECK (
    ("tax_type" = 'EXEMPT' AND "tax_mode" = 'EXEMPT')
    OR ("tax_type" = 'ZERO_RATED' AND "tax_mode" = 'ZERO_RATED')
    OR ("tax_type" NOT IN ('EXEMPT', 'ZERO_RATED') AND "tax_mode" IN ('INCLUSIVE', 'EXCLUSIVE'))
  )
);

CREATE UNIQUE INDEX "tax_profiles_tenant_id_id_key"
  ON "tax_profiles"("tenant_id", "id");
CREATE UNIQUE INDEX "tax_profiles_tenant_code_key"
  ON "tax_profiles"("tenant_id", "code");
CREATE UNIQUE INDEX "tax_profiles_one_active_default_per_tenant_key"
  ON "tax_profiles"("tenant_id")
  WHERE "is_default" = true AND "status" = 'ACTIVE';
CREATE INDEX "tax_profiles_status_default_idx"
  ON "tax_profiles"("tenant_id", "status", "is_default");
CREATE INDEX "tax_profiles_type_mode_idx"
  ON "tax_profiles"("tenant_id", "tax_type", "tax_mode");

ALTER TABLE "tax_profiles"
  ADD CONSTRAINT "tax_profiles_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_profiles"
  ADD CONSTRAINT "tax_profiles_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_profiles"
  ADD CONSTRAINT "tax_profiles_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tax_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_profiles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tax_profiles_tenant_isolation" ON "tax_profiles"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());
