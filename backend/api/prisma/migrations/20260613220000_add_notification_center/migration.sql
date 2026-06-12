CREATE TYPE "NotificationAudience" AS ENUM ('USER', 'TENANT', 'OUTLET');
CREATE TYPE "NotificationCategory" AS ENUM (
  'SYSTEM',
  'SECURITY',
  'OPERATIONS',
  'ORDERS',
  'KITCHEN',
  'BILLING',
  'PAYMENTS',
  'INVENTORY',
  'STAFF',
  'CUSTOMER',
  'REPORTS'
);
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'PENDING',
  'DELIVERED',
  'SKIPPED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "outlet_id" UUID,
    "audience" "NotificationAudience" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" VARCHAR(180) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "action_url" VARCHAR(500),
    "metadata" JSONB,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "delivery_status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "delivered_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_audience_scope_check"
      CHECK (
        ("audience" = 'OUTLET' AND "outlet_id" IS NOT NULL)
        OR
        ("audience" = 'TENANT' AND "outlet_id" IS NULL)
        OR
        ("audience" = 'USER')
      ),
    CONSTRAINT "notifications_delivery_time_check"
      CHECK (
        ("delivery_status" = 'DELIVERED' AND "delivered_at" IS NOT NULL)
        OR
        ("delivery_status" <> 'DELIVERED' AND "delivered_at" IS NULL)
      ),
    CONSTRAINT "notifications_expiry_check"
      CHECK ("expires_at" IS NULL OR "expires_at" > "created_at")
);

CREATE TABLE "notification_recipients" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivery_status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "delivered_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_recipients_delivery_time_check"
      CHECK (
        ("delivery_status" = 'DELIVERED' AND "delivered_at" IS NOT NULL)
        OR
        ("delivery_status" <> 'DELIVERED' AND "delivered_at" IS NULL)
      )
);

CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_tenant_id_id_key"
  ON "notifications"("tenant_id", "id");
CREATE INDEX "notifications_tenant_created_idx"
  ON "notifications"("tenant_id", "created_at");
CREATE INDEX "notifications_outlet_created_idx"
  ON "notifications"("tenant_id", "outlet_id", "created_at");
CREATE INDEX "notifications_catalog_idx"
  ON "notifications"("tenant_id", "category", "priority", "created_at");
CREATE INDEX "notifications_delivery_idx"
  ON "notifications"("tenant_id", "delivery_status", "created_at");

CREATE UNIQUE INDEX "notification_recipients_tenant_id_id_key"
  ON "notification_recipients"("tenant_id", "id");
CREATE UNIQUE INDEX "notification_recipients_tenant_id_notification_id_user_id_key"
  ON "notification_recipients"("tenant_id", "notification_id", "user_id");
CREATE INDEX "notification_recipients_inbox_idx"
  ON "notification_recipients"("tenant_id", "user_id", "read_at", "created_at");
CREATE INDEX "notification_recipients_delivery_idx"
  ON "notification_recipients"("tenant_id", "notification_id", "delivery_status");

CREATE UNIQUE INDEX "notification_preferences_tenant_id_id_key"
  ON "notification_preferences"("tenant_id", "id");
CREATE UNIQUE INDEX "notification_preferences_tenant_id_user_id_category_key"
  ON "notification_preferences"("tenant_id", "user_id", "category");
CREATE INDEX "notification_preferences_user_idx"
  ON "notification_preferences"("tenant_id", "user_id");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_tenant_id_outlet_id_fkey"
  FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_recipients"
  ADD CONSTRAINT "notification_recipients_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_recipients"
  ADD CONSTRAINT "notification_recipients_tenant_id_notification_id_fkey"
  FOREIGN KEY ("tenant_id", "notification_id") REFERENCES "notifications"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_recipients"
  ADD CONSTRAINT "notification_recipients_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY "notifications_tenant_isolation"
ON "notifications"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "notification_recipients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_recipients" FORCE ROW LEVEL SECURITY;
CREATE POLICY "notification_recipients_tenant_isolation"
ON "notification_recipients"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" FORCE ROW LEVEL SECURITY;
CREATE POLICY "notification_preferences_tenant_isolation"
ON "notification_preferences"
USING (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id())
WITH CHECK (app_is_platform_admin() OR "tenant_id" = app_current_tenant_id());

CREATE OR REPLACE FUNCTION reject_notification_content_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'notification content is immutable';
END;
$$;

CREATE TRIGGER "notifications_immutable_content"
BEFORE UPDATE OF
  "tenant_id",
  "outlet_id",
  "audience",
  "category",
  "priority",
  "title",
  "body",
  "action_url",
  "metadata",
  "is_mandatory",
  "created_by_user_id",
  "created_at"
ON "notifications"
FOR EACH ROW EXECUTE FUNCTION reject_notification_content_mutation();

CREATE TRIGGER "notifications_no_delete"
BEFORE DELETE ON "notifications"
FOR EACH ROW EXECUTE FUNCTION reject_notification_content_mutation();

CREATE TRIGGER "notification_recipients_no_delete"
BEFORE DELETE ON "notification_recipients"
FOR EACH ROW EXECUTE FUNCTION reject_notification_content_mutation();
