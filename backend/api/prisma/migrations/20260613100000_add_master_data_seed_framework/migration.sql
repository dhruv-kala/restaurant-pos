CREATE TABLE "countries" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "code" CITEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "iso_code" CHAR(3) NOT NULL,
  "phone_code" VARCHAR(8) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "currencies" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "code" CHAR(3) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "symbol" VARCHAR(12) NOT NULL,
  "decimal_places" INTEGER NOT NULL DEFAULT 2,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "languages" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "code" VARCHAR(35) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timezones" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "timezone_id" VARCHAR(64) NOT NULL,
  "display_name" VARCHAR(120) NOT NULL,
  "utc_offset" VARCHAR(6) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "timezones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_modules" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "module_key" CITEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "application_modules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_settings" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "setting_key" CITEXT NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "value" JSONB NOT NULL,
  "description" VARCHAR(500),
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_role_templates" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "role_key" CITEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500),
  "is_platform_role" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "system_role_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_role_permissions" (
  "role_template_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_role_permissions_pkey" PRIMARY KEY ("role_template_id", "permission_id")
);

CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");
CREATE UNIQUE INDEX "countries_iso_code_key" ON "countries"("iso_code");
CREATE INDEX "countries_is_active_name_idx" ON "countries"("is_active", "name");
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");
CREATE INDEX "currencies_is_active_name_idx" ON "currencies"("is_active", "name");
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");
CREATE INDEX "languages_is_active_name_idx" ON "languages"("is_active", "name");
CREATE UNIQUE INDEX "timezones_timezone_id_key" ON "timezones"("timezone_id");
CREATE INDEX "timezones_display_name_idx" ON "timezones"("display_name");
CREATE UNIQUE INDEX "application_modules_module_key_key" ON "application_modules"("module_key");
CREATE INDEX "application_modules_is_active_name_idx" ON "application_modules"("is_active", "name");
CREATE UNIQUE INDEX "system_settings_setting_key_key" ON "system_settings"("setting_key");
CREATE INDEX "system_settings_category_is_active_idx" ON "system_settings"("category", "is_active");
CREATE UNIQUE INDEX "system_role_templates_role_key_key" ON "system_role_templates"("role_key");
CREATE INDEX "system_role_templates_is_active_name_idx" ON "system_role_templates"("is_active", "name");
CREATE INDEX "system_role_permissions_permission_id_idx" ON "system_role_permissions"("permission_id");

ALTER TABLE "currencies"
  ADD CONSTRAINT "currencies_decimal_places_check"
  CHECK ("decimal_places" BETWEEN 0 AND 4);

ALTER TABLE "system_role_permissions"
  ADD CONSTRAINT "system_role_permissions_role_template_id_fkey"
  FOREIGN KEY ("role_template_id") REFERENCES "system_role_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "system_role_permissions"
  ADD CONSTRAINT "system_role_permissions_permission_id_fkey"
  FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
