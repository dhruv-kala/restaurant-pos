CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION app_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    unix_ts_ms bytea;
    uuid_bytes bytea;
BEGIN
    unix_ts_ms :=
        substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);
    uuid_bytes := unix_ts_ms || gen_random_bytes(10);
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

    RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT nullif(current_setting('app.tenant_id', true), '')::uuid;
$$;

CREATE TYPE "tenant_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "outlet_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "user_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "membership_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "slug" VARCHAR(63) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "tenant_status" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(35) NOT NULL DEFAULT 'en-IN',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    "currency_code" CHAR(3) NOT NULL DEFAULT 'INR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenants_slug_format_check"
        CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT "tenants_name_not_blank_check"
        CHECK (btrim("name") <> ''),
    CONSTRAINT "tenants_locale_not_blank_check"
        CHECK (btrim("locale") <> ''),
    CONSTRAINT "tenants_timezone_not_blank_check"
        CHECK (btrim("timezone") <> ''),
    CONSTRAINT "tenants_currency_code_format_check"
        CHECK ("currency_code" ~ '^[A-Z]{3}$'),
    CONSTRAINT "tenants_version_positive_check"
        CHECK ("version" > 0),
    CONSTRAINT "tenants_deleted_at_check"
        CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at")
);

CREATE TABLE "outlets" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "status" "outlet_status" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "outlets_code_not_blank_check"
        CHECK (btrim("code") <> ''),
    CONSTRAINT "outlets_name_not_blank_check"
        CHECK (btrim("name") <> ''),
    CONSTRAINT "outlets_timezone_not_blank_check"
        CHECK (btrim("timezone") <> ''),
    CONSTRAINT "outlets_version_positive_check"
        CHECK ("version" > 0),
    CONSTRAINT "outlets_deleted_at_check"
        CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at")
);

CREATE TABLE "user_accounts" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "email" CITEXT,
    "phone" VARCHAR(20),
    "display_name" VARCHAR(160) NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'INVITED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_accounts_identity_required_check"
        CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL),
    CONSTRAINT "user_accounts_email_not_blank_check"
        CHECK ("email" IS NULL OR btrim("email"::text) <> ''),
    CONSTRAINT "user_accounts_phone_format_check"
        CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "user_accounts_display_name_not_blank_check"
        CHECK (btrim("display_name") <> ''),
    CONSTRAINT "user_accounts_version_positive_check"
        CHECK ("version" > 0),
    CONSTRAINT "user_accounts_deleted_at_check"
        CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at")
);

CREATE TABLE "tenant_memberships" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "membership_status" NOT NULL DEFAULT 'INVITED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "joined_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_memberships_version_positive_check"
        CHECK ("version" > 0),
    CONSTRAINT "tenant_memberships_joined_at_check"
        CHECK ("joined_at" IS NULL OR "joined_at" >= "created_at"),
    CONSTRAINT "tenant_memberships_revocation_check"
        CHECK (
            ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL)
            OR ("status" <> 'REVOKED' AND "revoked_at" IS NULL)
        )
);

CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "name" CITEXT NOT NULL,
    "system_key" VARCHAR(80),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roles_name_not_blank_check"
        CHECK (btrim("name"::text) <> ''),
    CONSTRAINT "roles_system_key_format_check"
        CHECK (
            ("is_system" AND "system_key" ~ '^[a-z][a-z0-9_]*$')
            OR (NOT "is_system" AND "system_key" IS NULL)
        ),
    CONSTRAINT "roles_version_positive_check"
        CHECK ("version" > 0),
    CONSTRAINT "roles_deleted_at_check"
        CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at")
);

CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "permission_key" VARCHAR(120) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "permissions_key_format_check"
        CHECK ("permission_key" ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
    CONSTRAINT "permissions_module_format_check"
        CHECK ("module" ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT "permissions_description_not_blank_check"
        CHECK (btrim("description") <> '')
);

CREATE TABLE "membership_roles" (
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_roles_pkey"
        PRIMARY KEY ("tenant_id", "membership_id", "role_id")
);

CREATE TABLE "role_permissions" (
    "tenant_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "constraints" JSONB,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey"
        PRIMARY KEY ("tenant_id", "role_id", "permission_id"),
    CONSTRAINT "role_permissions_constraints_object_check"
        CHECK (
            "constraints" IS NULL
            OR jsonb_typeof("constraints") = 'object'
        )
);

CREATE TABLE "membership_outlets" (
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_outlets_pkey"
        PRIMARY KEY ("tenant_id", "membership_id", "outlet_id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_status_idx" ON "tenants"("status");
CREATE INDEX "tenants_deleted_at_idx" ON "tenants"("deleted_at");

CREATE INDEX "outlets_tenant_id_status_idx"
    ON "outlets"("tenant_id", "status");
CREATE INDEX "outlets_tenant_id_deleted_at_idx"
    ON "outlets"("tenant_id", "deleted_at");
CREATE UNIQUE INDEX "outlets_tenant_id_id_key"
    ON "outlets"("tenant_id", "id");
CREATE UNIQUE INDEX "outlets_tenant_id_code_key"
    ON "outlets"("tenant_id", "code");

CREATE UNIQUE INDEX "user_accounts_email_key" ON "user_accounts"("email");
CREATE UNIQUE INDEX "user_accounts_phone_key" ON "user_accounts"("phone");
CREATE INDEX "user_accounts_status_idx" ON "user_accounts"("status");
CREATE INDEX "user_accounts_deleted_at_idx" ON "user_accounts"("deleted_at");

CREATE INDEX "tenant_memberships_user_id_status_idx"
    ON "tenant_memberships"("user_id", "status");
CREATE INDEX "tenant_memberships_tenant_id_status_idx"
    ON "tenant_memberships"("tenant_id", "status");
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_id_key"
    ON "tenant_memberships"("tenant_id", "id");
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key"
    ON "tenant_memberships"("tenant_id", "user_id");

CREATE INDEX "roles_tenant_id_deleted_at_idx"
    ON "roles"("tenant_id", "deleted_at");
CREATE UNIQUE INDEX "roles_tenant_id_id_key"
    ON "roles"("tenant_id", "id");
CREATE UNIQUE INDEX "roles_tenant_id_name_key"
    ON "roles"("tenant_id", "name");
CREATE UNIQUE INDEX "roles_tenant_id_system_key_key"
    ON "roles"("tenant_id", "system_key");

CREATE UNIQUE INDEX "permissions_permission_key_key"
    ON "permissions"("permission_key");
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

CREATE INDEX "membership_roles_tenant_id_role_id_idx"
    ON "membership_roles"("tenant_id", "role_id");
CREATE INDEX "role_permissions_permission_id_idx"
    ON "role_permissions"("permission_id");
CREATE INDEX "membership_outlets_tenant_id_outlet_id_idx"
    ON "membership_outlets"("tenant_id", "outlet_id");

ALTER TABLE "outlets"
    ADD CONSTRAINT "outlets_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_memberships"
    ADD CONSTRAINT "tenant_memberships_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_memberships"
    ADD CONSTRAINT "tenant_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roles"
    ADD CONSTRAINT "roles_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_roles"
    ADD CONSTRAINT "membership_roles_tenant_id_membership_id_fkey"
    FOREIGN KEY ("tenant_id", "membership_id")
    REFERENCES "tenant_memberships"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_roles"
    ADD CONSTRAINT "membership_roles_tenant_id_role_id_fkey"
    FOREIGN KEY ("tenant_id", "role_id")
    REFERENCES "roles"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_tenant_id_role_id_fkey"
    FOREIGN KEY ("tenant_id", "role_id")
    REFERENCES "roles"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_outlets"
    ADD CONSTRAINT "membership_outlets_tenant_id_membership_id_fkey"
    FOREIGN KEY ("tenant_id", "membership_id")
    REFERENCES "tenant_memberships"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_outlets"
    ADD CONSTRAINT "membership_outlets_tenant_id_outlet_id_fkey"
    FOREIGN KEY ("tenant_id", "outlet_id")
    REFERENCES "outlets"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenants_tenant_isolation" ON "tenants"
    USING ("id" = app_current_tenant_id())
    WITH CHECK ("id" = app_current_tenant_id());

ALTER TABLE "outlets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outlets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outlets_tenant_isolation" ON "outlets"
    USING ("tenant_id" = app_current_tenant_id())
    WITH CHECK ("tenant_id" = app_current_tenant_id());

ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_memberships_tenant_isolation" ON "tenant_memberships"
    USING ("tenant_id" = app_current_tenant_id())
    WITH CHECK ("tenant_id" = app_current_tenant_id());

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "roles_tenant_isolation" ON "roles"
    USING ("tenant_id" = app_current_tenant_id())
    WITH CHECK ("tenant_id" = app_current_tenant_id());

ALTER TABLE "membership_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "membership_roles_tenant_isolation" ON "membership_roles"
    USING ("tenant_id" = app_current_tenant_id())
    WITH CHECK ("tenant_id" = app_current_tenant_id());

ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_tenant_isolation" ON "role_permissions"
    USING ("tenant_id" = app_current_tenant_id())
    WITH CHECK ("tenant_id" = app_current_tenant_id());

ALTER TABLE "membership_outlets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_outlets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "membership_outlets_tenant_isolation" ON "membership_outlets"
    USING ("tenant_id" = app_current_tenant_id())
    WITH CHECK ("tenant_id" = app_current_tenant_id());
