ALTER TYPE "user_status" ADD VALUE IF NOT EXISTS 'INACTIVE' AFTER 'ACTIVE';
ALTER TYPE "membership_status" ADD VALUE IF NOT EXISTS 'INACTIVE' AFTER 'ACTIVE';

ALTER TABLE "roles"
  ADD COLUMN "description" VARCHAR(500),
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "permissions"
  ADD COLUMN "action" VARCHAR(80),
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "permissions"
SET "action" = COALESCE(NULLIF(split_part("permission_key", '.', 2), ''), 'manage')
WHERE "action" IS NULL;

ALTER TABLE "permissions"
  ALTER COLUMN "action" SET NOT NULL;

CREATE INDEX "roles_tenant_id_is_active_deleted_at_idx"
  ON "roles"("tenant_id", "is_active", "deleted_at");

CREATE INDEX "permissions_module_is_active_idx"
  ON "permissions"("module", "is_active");
