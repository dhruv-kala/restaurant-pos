import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('recipe and consumption schema contract', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260612200000_add_recipe_consumption_engine',
      'migration.sql',
    ),
    'utf8',
  );

  it('defines recipes, production recipes, costing, consumption, and wastage', () => {
    for (const model of [
      'Recipe',
      'RecipeIngredient',
      'RecipeCostSnapshot',
      'ProductionRecipe',
      'ProductionRecipeIngredient',
      'InventoryConsumption',
      'InventoryWastage',
    ]) {
      expect(schema).toContain(`model ${model}`);
    }
  });

  it('enforces one consumption per order item and ingredient', () => {
    expect(schema).toContain('@@unique([tenantId, orderItemId, ingredientId])');
    expect(migration).toContain('inventory_consumptions_idempotency_key');
  });

  it('forces tenant row-level security on all new tables', () => {
    expect(migration).toContain("'recipes', 'recipe_ingredients'");
    expect(migration).toContain("'inventory_consumptions', 'inventory_wastages'");
    expect(migration).toContain(
      "EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name)",
    );
    expect(migration).toContain('app_tenant_access_allowed(tenant_id)');
  });

  it('allows negative available stock while protecting other stock buckets', () => {
    expect(migration).toContain('DROP CONSTRAINT "inventory_stock_quantities_check"');
    expect(migration).toContain('"reserved_quantity" >= 0');
    expect(migration).toContain('"damaged_quantity" >= 0');
  });
});
