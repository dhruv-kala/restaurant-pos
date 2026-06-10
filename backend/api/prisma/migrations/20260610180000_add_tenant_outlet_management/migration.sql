ALTER TYPE "tenant_status" ADD VALUE IF NOT EXISTS 'INACTIVE';
ALTER TYPE "tenant_status" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "tenant_status" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TYPE "outlet_status" ADD VALUE IF NOT EXISTS 'TEMPORARILY_CLOSED';

ALTER TABLE "tenants"
    ADD COLUMN "legal_name" VARCHAR(200),
    ADD COLUMN "email" CITEXT,
    ADD COLUMN "phone" VARCHAR(20),
    ADD COLUMN "outlet_limit" INTEGER NOT NULL DEFAULT 1,
    ADD CONSTRAINT "tenants_email_not_blank_check"
        CHECK ("email" IS NULL OR btrim("email"::text) <> ''),
    ADD CONSTRAINT "tenants_phone_format_check"
        CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$'),
    ADD CONSTRAINT "tenants_outlet_limit_positive_check"
        CHECK ("outlet_limit" > 0);

ALTER TABLE "outlets"
    ADD COLUMN "email" CITEXT,
    ADD COLUMN "phone" VARCHAR(20),
    ADD COLUMN "address_line_1" VARCHAR(200),
    ADD COLUMN "address_line_2" VARCHAR(200),
    ADD COLUMN "city" VARCHAR(100),
    ADD COLUMN "state" VARCHAR(100),
    ADD COLUMN "country" VARCHAR(2),
    ADD COLUMN "postal_code" VARCHAR(20),
    ADD CONSTRAINT "outlets_email_not_blank_check"
        CHECK ("email" IS NULL OR btrim("email"::text) <> ''),
    ADD CONSTRAINT "outlets_phone_format_check"
        CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$'),
    ADD CONSTRAINT "outlets_country_format_check"
        CHECK ("country" IS NULL OR "country" ~ '^[A-Z]{2}$');

ALTER TABLE "user_accounts"
    ADD COLUMN "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION app_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT coalesce(
        nullif(current_setting('app.is_platform_admin', true), '')::boolean,
        false
    );
$$;

DROP POLICY "tenants_tenant_isolation" ON "tenants";
CREATE POLICY "tenants_tenant_or_platform_isolation" ON "tenants"
    USING ("id" = app_current_tenant_id() OR app_is_platform_admin())
    WITH CHECK ("id" = app_current_tenant_id() OR app_is_platform_admin());

DROP POLICY "outlets_tenant_isolation" ON "outlets";
CREATE POLICY "outlets_tenant_or_platform_isolation" ON "outlets"
    USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
    WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());

DROP POLICY "tenant_memberships_tenant_or_user_isolation" ON "tenant_memberships";
CREATE POLICY "tenant_memberships_context_isolation" ON "tenant_memberships"
    USING (
        "tenant_id" = app_current_tenant_id()
        OR "user_id" = app_current_user_id()
        OR app_is_platform_admin()
    )
    WITH CHECK (
        "tenant_id" = app_current_tenant_id()
        OR app_is_platform_admin()
    );

DROP POLICY "roles_tenant_isolation" ON "roles";
CREATE POLICY "roles_tenant_or_platform_isolation" ON "roles"
    USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
    WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());

DROP POLICY "membership_roles_tenant_isolation" ON "membership_roles";
CREATE POLICY "membership_roles_tenant_or_platform_isolation" ON "membership_roles"
    USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
    WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());

DROP POLICY "role_permissions_tenant_isolation" ON "role_permissions";
CREATE POLICY "role_permissions_tenant_or_platform_isolation" ON "role_permissions"
    USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
    WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());

DROP POLICY "membership_outlets_tenant_isolation" ON "membership_outlets";
CREATE POLICY "membership_outlets_tenant_or_platform_isolation" ON "membership_outlets"
    USING ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin())
    WITH CHECK ("tenant_id" = app_current_tenant_id() OR app_is_platform_admin());
