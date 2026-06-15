import 'package:sqflite_common/sqlite_api.dart' as sqlite;

const offlineDatabaseVersion = 1;

Future<void> createOfflineDatabaseSchema(sqlite.Database database) async {
  await database.execute('''
CREATE TABLE IF NOT EXISTS device_sync_state (
  tenant_id TEXT NOT NULL,
  outlet_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  trusted_session_id TEXT,
  sync_enabled INTEGER NOT NULL DEFAULT 1,
  is_online INTEGER NOT NULL DEFAULT 0,
  last_pull_cursor TEXT,
  last_pushed_at TEXT,
  last_pulled_at TEXT,
  pending_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, outlet_id, device_id)
)
''');

  await _createProjectionTable(
    database,
    tableName: 'local_orders',
    extraColumns: '''
  business_date TEXT NOT NULL,
  order_number TEXT,
  status TEXT NOT NULL,
''',
  );
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_local_orders_scope_date '
    'ON local_orders (tenant_id, outlet_id, business_date, updated_at)',
  );

  await _createProjectionTable(
    database,
    tableName: 'local_bills',
    extraColumns: '''
  business_date TEXT NOT NULL,
  order_id TEXT,
  bill_number TEXT,
  status TEXT NOT NULL,
  total_minor INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
''',
  );
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_local_bills_scope_date '
    'ON local_bills (tenant_id, outlet_id, business_date, updated_at)',
  );

  await _createProjectionTable(
    database,
    tableName: 'local_customers',
    extraColumns: '''
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
''',
  );
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_local_customers_scope_name '
    'ON local_customers (tenant_id, outlet_id, display_name)',
  );

  await _createProjectionTable(
    database,
    tableName: 'local_inventory_items',
    extraColumns: '''
  sku TEXT,
  name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_code TEXT NOT NULL,
''',
  );
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_local_inventory_scope_name '
    'ON local_inventory_items (tenant_id, outlet_id, name)',
  );
}

Future<void> _createProjectionTable(
  sqlite.Database database, {
  required String tableName,
  required String extraColumns,
}) async {
  await database.execute('''
CREATE TABLE IF NOT EXISTS $tableName (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  outlet_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
$extraColumns
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  is_dirty INTEGER NOT NULL DEFAULT 0,
  CHECK (length(id) > 0),
  CHECK (length(tenant_id) > 0),
  CHECK (length(outlet_id) > 0),
  CHECK (length(device_id) > 0)
)
''');
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_${tableName}_scope '
    'ON $tableName (tenant_id, outlet_id, device_id)',
  );
}
