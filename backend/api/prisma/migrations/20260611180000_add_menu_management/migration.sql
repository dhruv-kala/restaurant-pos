CREATE TABLE "menu_categories" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "sku" VARCHAR(64),
    "price_minor" INTEGER NOT NULL,
    "cost_price_minor" INTEGER,
    "image_url" VARCHAR(2048),
    "is_vegetarian" BOOLEAN NOT NULL DEFAULT false,
    "is_vegan" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "menu_items_price_minor_check" CHECK ("price_minor" > 0),
    CONSTRAINT "menu_items_cost_price_minor_check" CHECK ("cost_price_minor" IS NULL OR "cost_price_minor" >= 0),
    CONSTRAINT "menu_items_tax_percentage_check" CHECK ("tax_percentage" >= 0 AND "tax_percentage" <= 100)
);

CREATE TABLE "menu_item_variants" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "price_adjustment_minor" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_item_addons" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "menu_item_addons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "menu_item_addons_price_minor_check" CHECK ("price_minor" >= 0)
);

CREATE TABLE "outlet_menu_prices" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "tenant_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "outlet_menu_prices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "outlet_menu_prices_price_minor_check" CHECK ("price_minor" > 0)
);

CREATE UNIQUE INDEX "menu_categories_tenant_id_id_key" ON "menu_categories"("tenant_id", "id");
CREATE UNIQUE INDEX "menu_categories_tenant_id_name_key" ON "menu_categories"("tenant_id", "name");
CREATE INDEX "menu_categories_tenant_id_idx" ON "menu_categories"("tenant_id");
CREATE INDEX "menu_categories_tenant_id_parent_id_idx" ON "menu_categories"("tenant_id", "parent_id");
CREATE INDEX "menu_categories_tenant_id_name_idx" ON "menu_categories"("tenant_id", "name");
CREATE INDEX "menu_categories_tenant_id_is_active_deleted_at_idx" ON "menu_categories"("tenant_id", "is_active", "deleted_at");

CREATE UNIQUE INDEX "menu_items_tenant_id_id_key" ON "menu_items"("tenant_id", "id");
CREATE UNIQUE INDEX "menu_items_tenant_id_sku_key" ON "menu_items"("tenant_id", "sku");
CREATE INDEX "menu_items_tenant_id_idx" ON "menu_items"("tenant_id");
CREATE INDEX "menu_items_tenant_id_category_id_idx" ON "menu_items"("tenant_id", "category_id");
CREATE INDEX "menu_items_tenant_id_name_idx" ON "menu_items"("tenant_id", "name");
CREATE INDEX "menu_items_tenant_id_is_available_deleted_at_idx" ON "menu_items"("tenant_id", "is_available", "deleted_at");

CREATE UNIQUE INDEX "menu_item_variants_tenant_id_id_key" ON "menu_item_variants"("tenant_id", "id");
CREATE UNIQUE INDEX "menu_item_variants_tenant_id_menu_item_id_name_key" ON "menu_item_variants"("tenant_id", "menu_item_id", "name");
CREATE INDEX "menu_item_variants_tenant_id_menu_item_id_deleted_at_idx" ON "menu_item_variants"("tenant_id", "menu_item_id", "deleted_at");
CREATE UNIQUE INDEX "menu_item_variants_one_default_per_item" ON "menu_item_variants"("tenant_id", "menu_item_id") WHERE "is_default" AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX "menu_item_addons_tenant_id_id_key" ON "menu_item_addons"("tenant_id", "id");
CREATE UNIQUE INDEX "menu_item_addons_tenant_id_menu_item_id_name_key" ON "menu_item_addons"("tenant_id", "menu_item_id", "name");
CREATE INDEX "menu_item_addons_tenant_id_menu_item_id_deleted_at_idx" ON "menu_item_addons"("tenant_id", "menu_item_id", "deleted_at");

CREATE UNIQUE INDEX "outlet_menu_prices_tenant_id_id_key" ON "outlet_menu_prices"("tenant_id", "id");
CREATE UNIQUE INDEX "outlet_menu_prices_tenant_id_outlet_id_menu_item_id_key" ON "outlet_menu_prices"("tenant_id", "outlet_id", "menu_item_id");
CREATE INDEX "outlet_menu_prices_tenant_id_menu_item_id_deleted_at_idx" ON "outlet_menu_prices"("tenant_id", "menu_item_id", "deleted_at");
CREATE INDEX "outlet_menu_prices_tenant_id_outlet_id_deleted_at_idx" ON "outlet_menu_prices"("tenant_id", "outlet_id", "deleted_at");

ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_tenant_id_parent_id_fkey" FOREIGN KEY ("tenant_id", "parent_id") REFERENCES "menu_categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_category_id_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "menu_categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_item_addons" ADD CONSTRAINT "menu_item_addons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_item_addons" ADD CONSTRAINT "menu_item_addons_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outlet_menu_prices" ADD CONSTRAINT "outlet_menu_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outlet_menu_prices" ADD CONSTRAINT "outlet_menu_prices_tenant_id_outlet_id_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outlet_menu_prices" ADD CONSTRAINT "outlet_menu_prices_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "menu_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_categories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "menu_item_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_item_variants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "menu_item_addons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_item_addons" FORCE ROW LEVEL SECURITY;
ALTER TABLE "outlet_menu_prices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outlet_menu_prices" FORCE ROW LEVEL SECURITY;

CREATE POLICY "menu_categories_tenant_isolation" ON "menu_categories"
USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "menu_items_tenant_isolation" ON "menu_items"
USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "menu_item_variants_tenant_isolation" ON "menu_item_variants"
USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "menu_item_addons_tenant_isolation" ON "menu_item_addons"
USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY "outlet_menu_prices_tenant_isolation" ON "outlet_menu_prices"
USING (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
