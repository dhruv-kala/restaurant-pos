CREATE TYPE "subscription_plan_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "subscription_billing_interval" AS ENUM ('MONTHLY', 'YEARLY');

CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "code" CITEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "billing_interval" "subscription_billing_interval" NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "status" "subscription_plan_status" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID NOT NULL,
    "activated_at" TIMESTAMPTZ(3),
    "deactivated_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscription_plans_price_check" CHECK ("price_minor" >= 0),
    CONSTRAINT "subscription_plans_version_number_check" CHECK ("version_number" > 0),
    CONSTRAINT "subscription_plans_version_check" CHECK ("version" > 0),
    CONSTRAINT "subscription_plans_currency_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
    CONSTRAINT "subscription_plans_activation_check" CHECK (
        ("status" = 'DRAFT' AND "activated_at" IS NULL AND "deactivated_at" IS NULL)
        OR ("status" = 'ACTIVE' AND "activated_at" IS NOT NULL AND "deactivated_at" IS NULL)
        OR ("status" = 'INACTIVE' AND "activated_at" IS NOT NULL AND "deactivated_at" IS NOT NULL)
    )
);

CREATE TABLE "subscription_plan_features" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "plan_id" UUID NOT NULL,
    "feature_key" VARCHAR(120) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "limit_value" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_plan_features_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscription_plan_features_limit_check" CHECK ("limit_value" IS NULL OR "limit_value" >= 0)
);

CREATE UNIQUE INDEX "subscription_plans_code_version_key"
    ON "subscription_plans"("code", "version_number");
CREATE UNIQUE INDEX "subscription_plans_one_active_code_key"
    ON "subscription_plans"("code") WHERE "status" = 'ACTIVE';
CREATE INDEX "subscription_plans_directory_idx"
    ON "subscription_plans"("status", "code", "version_number");
CREATE UNIQUE INDEX "subscription_plan_features_plan_key"
    ON "subscription_plan_features"("plan_id", "feature_key");
CREATE INDEX "subscription_plan_features_lookup_idx"
    ON "subscription_plan_features"("feature_key", "is_enabled");

ALTER TABLE "subscription_plans"
    ADD CONSTRAINT "subscription_plans_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_plans"
    ADD CONSTRAINT "subscription_plans_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_plan_features"
    ADD CONSTRAINT "subscription_plan_features_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_activated_subscription_plan_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."activated_at" IS NOT NULL AND (
    NEW."code" IS DISTINCT FROM OLD."code"
    OR NEW."version_number" IS DISTINCT FROM OLD."version_number"
    OR NEW."name" IS DISTINCT FROM OLD."name"
    OR NEW."description" IS DISTINCT FROM OLD."description"
    OR NEW."billing_interval" IS DISTINCT FROM OLD."billing_interval"
    OR NEW."price_minor" IS DISTINCT FROM OLD."price_minor"
    OR NEW."currency_code" IS DISTINCT FROM OLD."currency_code"
    OR NEW."created_by_user_id" IS DISTINCT FROM OLD."created_by_user_id"
    OR NEW."activated_at" IS DISTINCT FROM OLD."activated_at"
  ) THEN
    RAISE EXCEPTION 'Activated subscription plan versions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "subscription_plans_activated_immutable"
BEFORE UPDATE ON "subscription_plans"
FOR EACH ROW EXECUTE FUNCTION prevent_activated_subscription_plan_mutation();

CREATE OR REPLACE FUNCTION prevent_activated_subscription_plan_feature_mutation()
RETURNS trigger AS $$
DECLARE
  target_plan_id UUID;
  plan_activated_at TIMESTAMPTZ;
BEGIN
  target_plan_id := COALESCE(NEW."plan_id", OLD."plan_id");
  SELECT "activated_at" INTO plan_activated_at
  FROM "subscription_plans"
  WHERE "id" = target_plan_id;

  IF plan_activated_at IS NOT NULL THEN
    RAISE EXCEPTION 'Features of activated subscription plan versions are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "subscription_plan_features_activated_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "subscription_plan_features"
FOR EACH ROW EXECUTE FUNCTION prevent_activated_subscription_plan_feature_mutation();
