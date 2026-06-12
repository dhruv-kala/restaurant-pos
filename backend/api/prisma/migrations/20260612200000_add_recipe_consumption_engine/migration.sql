CREATE TYPE "wastage_reason" AS ENUM (
  'PREPARATION', 'EXPIRED', 'DAMAGED', 'SPILLAGE', 'QUALITY_REJECTION', 'OTHER'
);
CREATE TYPE "inventory_consumption_trigger" AS ENUM ('READY', 'COMPLETED');

ALTER TABLE "outlets"
  ADD COLUMN "allow_negative_stock" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consumption_trigger" "inventory_consumption_trigger" NOT NULL DEFAULT 'COMPLETED';

ALTER TABLE "inventory_stocks" DROP CONSTRAINT "inventory_stock_quantities_check";
ALTER TABLE "inventory_stocks" ADD CONSTRAINT "inventory_stock_non_available_quantities_check"
  CHECK ("reserved_quantity" >= 0 AND "damaged_quantity" >= 0);

CREATE TABLE "recipes" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "menu_item_id" UUID NOT NULL,
  "variant_id" UUID,
  "yield_unit_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "yield_quantity" DECIMAL(18,3) NOT NULL DEFAULT 1,
  "portion_multiplier" DECIMAL(10,4) NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recipes_yield_check" CHECK ("yield_quantity" > 0 AND "portion_multiplier" > 0)
);

CREATE TABLE "recipe_ingredients" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "recipe_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "wastage_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "notes" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recipe_ingredients_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "recipe_ingredients_wastage_check" CHECK (
    "wastage_percentage" >= 0 AND "wastage_percentage" < 100
  )
);

CREATE TABLE "recipe_cost_snapshots" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "recipe_id" UUID NOT NULL,
  "calculated_cost_minor" INTEGER NOT NULL,
  "ingredient_breakdown" JSONB NOT NULL,
  "calculated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipe_cost_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recipe_cost_snapshots_cost_check" CHECK ("calculated_cost_minor" >= 0)
);

CREATE TABLE "production_recipes" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "output_ingredient_id" UUID,
  "yield_unit_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "yield_quantity" DECIMAL(18,3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "production_recipes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "production_recipes_yield_check" CHECK ("yield_quantity" > 0)
);

CREATE TABLE "production_recipe_ingredients" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "production_recipe_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "production_recipe_ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "production_recipe_ingredients_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "inventory_consumptions" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "order_item_id" UUID NOT NULL,
  "recipe_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "consumed_quantity" DECIMAL(18,3) NOT NULL,
  "cost_at_consumption_minor" INTEGER NOT NULL,
  "trigger" "inventory_consumption_trigger" NOT NULL,
  "triggered_by_user_id" UUID NOT NULL,
  "consumed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_consumptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_consumptions_quantity_check" CHECK ("consumed_quantity" > 0),
  CONSTRAINT "inventory_consumptions_cost_check" CHECK ("cost_at_consumption_minor" >= 0)
);

CREATE TABLE "inventory_wastages" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "ingredient_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "reason" "wastage_reason" NOT NULL,
  "notes" VARCHAR(500),
  "cost_at_wastage_minor" INTEGER NOT NULL,
  "recorded_by_user_id" UUID NOT NULL,
  "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_wastages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_wastages_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_wastages_cost_check" CHECK ("cost_at_wastage_minor" >= 0)
);

CREATE UNIQUE INDEX "recipes_tenant_id_id_key" ON "recipes"("tenant_id", "id");
CREATE UNIQUE INDEX "recipes_active_target_key"
  ON "recipes"("tenant_id", "menu_item_id", COALESCE("variant_id", '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE "is_active" = true AND "deleted_at" IS NULL;
CREATE INDEX "recipes_lookup_idx" ON "recipes"("tenant_id", "menu_item_id", "variant_id", "is_active", "deleted_at");
CREATE INDEX "recipes_updated_idx" ON "recipes"("tenant_id", "updated_at");
CREATE UNIQUE INDEX "recipe_ingredients_tenant_id_id_key" ON "recipe_ingredients"("tenant_id", "id");
CREATE UNIQUE INDEX "recipe_ingredients_recipe_ingredient_key" ON "recipe_ingredients"("tenant_id", "recipe_id", "ingredient_id");
CREATE INDEX "recipe_ingredients_ingredient_idx" ON "recipe_ingredients"("tenant_id", "ingredient_id");
CREATE UNIQUE INDEX "recipe_cost_snapshots_tenant_id_id_key" ON "recipe_cost_snapshots"("tenant_id", "id");
CREATE INDEX "recipe_cost_snapshots_history_idx" ON "recipe_cost_snapshots"("tenant_id", "recipe_id", "calculated_at");
CREATE UNIQUE INDEX "production_recipes_tenant_id_id_key" ON "production_recipes"("tenant_id", "id");
CREATE UNIQUE INDEX "production_recipes_tenant_id_name_key" ON "production_recipes"("tenant_id", "name");
CREATE INDEX "production_recipes_output_idx" ON "production_recipes"("tenant_id", "output_ingredient_id", "is_active", "deleted_at");
CREATE UNIQUE INDEX "production_recipe_ingredients_tenant_id_id_key" ON "production_recipe_ingredients"("tenant_id", "id");
CREATE UNIQUE INDEX "production_recipe_ingredients_input_key" ON "production_recipe_ingredients"("tenant_id", "production_recipe_id", "ingredient_id");
CREATE INDEX "production_recipe_ingredients_ingredient_idx" ON "production_recipe_ingredients"("tenant_id", "ingredient_id");
CREATE UNIQUE INDEX "inventory_consumptions_tenant_id_id_key" ON "inventory_consumptions"("tenant_id", "id");
CREATE UNIQUE INDEX "inventory_consumptions_idempotency_key" ON "inventory_consumptions"("tenant_id", "order_item_id", "ingredient_id");
CREATE INDEX "inventory_consumptions_history_idx" ON "inventory_consumptions"("tenant_id", "outlet_id", "consumed_at");
CREATE INDEX "inventory_consumptions_order_idx" ON "inventory_consumptions"("tenant_id", "order_id");
CREATE UNIQUE INDEX "inventory_wastages_tenant_id_id_key" ON "inventory_wastages"("tenant_id", "id");
CREATE INDEX "inventory_wastages_history_idx" ON "inventory_wastages"("tenant_id", "outlet_id", "ingredient_id", "recorded_at");

ALTER TABLE "recipes"
  ADD CONSTRAINT "recipes_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipes_menu_item_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipes_variant_fkey" FOREIGN KEY ("tenant_id", "variant_id") REFERENCES "menu_item_variants"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipes_yield_unit_fkey" FOREIGN KEY ("tenant_id", "yield_unit_id") REFERENCES "units_of_measure"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipes_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipes_updated_by_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipe_ingredients_recipe_fkey" FOREIGN KEY ("tenant_id", "recipe_id") REFERENCES "recipes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipe_ingredients_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipe_ingredients_unit_fkey" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units_of_measure"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_cost_snapshots"
  ADD CONSTRAINT "recipe_cost_snapshots_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "recipe_cost_snapshots_recipe_fkey" FOREIGN KEY ("tenant_id", "recipe_id") REFERENCES "recipes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_recipes"
  ADD CONSTRAINT "production_recipes_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "production_recipes_output_fkey" FOREIGN KEY ("tenant_id", "output_ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "production_recipes_yield_unit_fkey" FOREIGN KEY ("tenant_id", "yield_unit_id") REFERENCES "units_of_measure"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "production_recipes_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "production_recipes_updated_by_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_recipe_ingredients"
  ADD CONSTRAINT "production_recipe_ingredients_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "production_recipe_ingredients_recipe_fkey" FOREIGN KEY ("tenant_id", "production_recipe_id") REFERENCES "production_recipes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "production_recipe_ingredients_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "production_recipe_ingredients_unit_fkey" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units_of_measure"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_consumptions"
  ADD CONSTRAINT "inventory_consumptions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_consumptions_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_consumptions_order_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_consumptions_order_item_fkey" FOREIGN KEY ("tenant_id", "order_item_id") REFERENCES "order_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_consumptions_recipe_fkey" FOREIGN KEY ("tenant_id", "recipe_id") REFERENCES "recipes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_consumptions_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_consumptions_unit_fkey" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units_of_measure"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_consumptions_triggered_by_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_wastages"
  ADD CONSTRAINT "inventory_wastages_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_wastages_outlet_fkey" FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_wastages_ingredient_fkey" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_wastages_unit_fkey" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units_of_measure"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_wastages_recorded_by_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'recipes', 'recipe_ingredients', 'recipe_cost_snapshots',
    'production_recipes', 'production_recipe_ingredients',
    'inventory_consumptions', 'inventory_wastages'
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
