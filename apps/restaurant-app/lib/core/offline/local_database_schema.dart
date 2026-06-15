import 'package:sqflite_common/sqlite_api.dart' as sqlite;

const offlineDatabaseVersion = 4;

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

  await database.execute('''
CREATE TABLE IF NOT EXISTS sync_queue (
  local_id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  outlet_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  base_version INTEGER,
  business_date TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  state TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  next_retry_at TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(local_id) > 0),
  CHECK (length(tenant_id) > 0),
  CHECK (length(outlet_id) > 0),
  CHECK (length(device_id) > 0),
  CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE', 'LIFECYCLE', 'APPEND')),
  CHECK (state IN ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CONFLICT', 'RETRYING')),
  UNIQUE (tenant_id, outlet_id, device_id, idempotency_key)
)
''');
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_sync_queue_scope_state '
    'ON sync_queue (tenant_id, outlet_id, device_id, state, created_at)',
  );
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_sync_queue_entity '
    'ON sync_queue (tenant_id, outlet_id, entity_type, entity_id)',
  );

  await database.execute('''
CREATE TABLE IF NOT EXISTS local_change_log (
  id TEXT NOT NULL PRIMARY KEY,
  queue_item_local_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  outlet_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  business_date TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (length(id) > 0),
  CHECK (length(queue_item_local_id) > 0),
  CHECK (length(tenant_id) > 0),
  CHECK (length(outlet_id) > 0),
  CHECK (length(device_id) > 0),
  CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE', 'LIFECYCLE', 'APPEND'))
)
''');
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_local_change_log_scope '
    'ON local_change_log (tenant_id, outlet_id, device_id, created_at)',
  );
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_local_change_log_entity '
    'ON local_change_log (tenant_id, outlet_id, entity_type, entity_id)',
  );

  await database.execute('''
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  outlet_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  queue_item_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL,
  resolution_strategy TEXT,
  detected_at TEXT NOT NULL,
  resolved_by_user_id TEXT,
  resolved_at TEXT,
  resolution_notes TEXT,
  local_payload_json TEXT NOT NULL,
  server_payload_json TEXT NOT NULL,
  CHECK (length(id) > 0),
  CHECK (length(tenant_id) > 0),
  CHECK (length(outlet_id) > 0),
  CHECK (length(device_id) > 0),
  CHECK (length(queue_item_id) > 0),
  CHECK (status IN ('OPEN', 'RESOLVED', 'IGNORED')),
  CHECK (
    resolution_strategy IS NULL OR
    resolution_strategy IN ('BUSINESS_RULE', 'SERVER_AUTHORITY', 'MANUAL_REVIEW', 'LAST_WRITE_WINS')
  )
)
''');
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_sync_conflicts_scope_status '
    'ON sync_conflicts (tenant_id, outlet_id, device_id, status, detected_at)',
  );
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity '
    'ON sync_conflicts (tenant_id, outlet_id, entity_type, entity_id)',
  );

  await database.execute('''
CREATE TABLE IF NOT EXISTS sync_conflict_decisions (
  id TEXT NOT NULL PRIMARY KEY,
  conflict_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  outlet_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  strategy TEXT NOT NULL,
  status_after TEXT NOT NULL,
  queue_state_after TEXT NOT NULL,
  decided_by_user_id TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  notes TEXT,
  CHECK (length(id) > 0),
  CHECK (length(conflict_id) > 0),
  CHECK (length(tenant_id) > 0),
  CHECK (length(outlet_id) > 0),
  CHECK (length(device_id) > 0),
  CHECK (strategy IN ('BUSINESS_RULE', 'SERVER_AUTHORITY', 'MANUAL_REVIEW', 'LAST_WRITE_WINS')),
  CHECK (status_after IN ('OPEN', 'RESOLVED', 'IGNORED')),
  CHECK (queue_state_after IN ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CONFLICT', 'RETRYING'))
)
''');
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_sync_conflict_decisions_conflict '
    'ON sync_conflict_decisions (tenant_id, outlet_id, device_id, conflict_id, decided_at)',
  );

  await database.execute('''
CREATE TABLE IF NOT EXISTS sync_batches (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  outlet_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  queue_item_ids_json TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  CHECK (length(id) > 0),
  CHECK (length(tenant_id) > 0),
  CHECK (length(outlet_id) > 0),
  CHECK (length(device_id) > 0),
  CHECK (state IN ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CONFLICT', 'RETRYING'))
)
''');
  await database.execute(
    'CREATE INDEX IF NOT EXISTS idx_sync_batches_scope '
    'ON sync_batches (tenant_id, outlet_id, device_id, created_at)',
  );

  await database.execute('''
CREATE TABLE IF NOT EXISTS sync_checkpoints (
  tenant_id TEXT NOT NULL,
  outlet_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  module TEXT NOT NULL,
  cursor TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(tenant_id) > 0),
  CHECK (length(outlet_id) > 0),
  CHECK (length(device_id) > 0),
  CHECK (length(module) > 0),
  PRIMARY KEY (tenant_id, outlet_id, device_id, module)
)
''');
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
