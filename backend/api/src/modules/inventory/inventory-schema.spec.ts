import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('inventory schema contract', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260612170000_add_inventory_management',
      'migration.sql',
    ),
    'utf8',
  );

  it('defines the inventory aggregates and append-only movement ledger', () => {
    for (const model of [
      'InventoryCategory',
      'UnitOfMeasure',
      'Ingredient',
      'InventoryStock',
      'InventoryBatch',
      'StockTransaction',
      'Vendor',
      'PurchaseOrder',
      'PurchaseOrderItem',
      'InventoryAlert',
    ]) {
      expect(schema).toContain(`model ${model}`);
    }
  });

  it('forces row-level security for inventory tables', () => {
    expect(migration).toContain('FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('app_tenant_access_allowed(tenant_id)');
  });

  it('protects balance, purchase total, and unresolved-alert invariants', () => {
    expect(migration).toContain('inventory_stock_quantities_check');
    expect(migration).toContain('purchase_orders_amounts_check');
    expect(migration).toContain('inventory_alerts_open_key');
  });
});
