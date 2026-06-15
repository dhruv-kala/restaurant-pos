import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:sqflite_common/sqlite_api.dart' as sqlite;

import 'local_database.dart';
import 'offline_entity_mapper.dart';
import 'offline_local_models.dart';

class OfflineLocalRepository {
  OfflineLocalRepository(this._database);

  final OfflineLocalDatabase _database;

  Future<void> upsertDeviceSyncState(DeviceSyncState state) async {
    final database = await _database.open();
    await database.insert(
      'device_sync_state',
      OfflineEntityMapper.deviceSyncStateToRow(state),
      conflictAlgorithm: sqlite.ConflictAlgorithm.replace,
    );
  }

  Future<DeviceSyncState?> getDeviceSyncState({
    required String tenantId,
    required String outletId,
    required String deviceId,
  }) async {
    final database = await _database.open();
    final rows = await database.query(
      'device_sync_state',
      where: 'tenant_id = ? AND outlet_id = ? AND device_id = ?',
      whereArgs: [tenantId, outletId, deviceId],
      limit: 1,
    );
    return rows.isEmpty
        ? null
        : OfflineEntityMapper.deviceSyncStateFromRow(rows.single);
  }

  Future<void> upsertOrder(LocalOrderProjection order) async {
    await _upsert('local_orders', OfflineEntityMapper.orderToRow(order));
  }

  Future<LocalOrderProjection?> getOrder({
    required String tenantId,
    required String outletId,
    required String id,
  }) async {
    final row = await _getProjection(
      'local_orders',
      tenantId: tenantId,
      outletId: outletId,
      id: id,
    );
    return row == null ? null : OfflineEntityMapper.orderFromRow(row);
  }

  Future<List<LocalOrderProjection>> listOrders({
    required String tenantId,
    required String outletId,
    DateTime? businessDate,
  }) async {
    final rows = await _listProjections(
      'local_orders',
      tenantId: tenantId,
      outletId: outletId,
      extraWhere: businessDate == null ? null : 'business_date = ?',
      extraArgs: businessDate == null
          ? const []
          : [businessDate.toUtc().toIso8601String()],
    );
    return rows.map(OfflineEntityMapper.orderFromRow).toList(growable: false);
  }

  Future<void> upsertBill(LocalBillProjection bill) async {
    await _upsert('local_bills', OfflineEntityMapper.billToRow(bill));
  }

  Future<LocalBillProjection?> getBill({
    required String tenantId,
    required String outletId,
    required String id,
  }) async {
    final row = await _getProjection(
      'local_bills',
      tenantId: tenantId,
      outletId: outletId,
      id: id,
    );
    return row == null ? null : OfflineEntityMapper.billFromRow(row);
  }

  Future<List<LocalBillProjection>> listBills({
    required String tenantId,
    required String outletId,
    DateTime? businessDate,
  }) async {
    final rows = await _listProjections(
      'local_bills',
      tenantId: tenantId,
      outletId: outletId,
      extraWhere: businessDate == null ? null : 'business_date = ?',
      extraArgs: businessDate == null
          ? const []
          : [businessDate.toUtc().toIso8601String()],
    );
    return rows.map(OfflineEntityMapper.billFromRow).toList(growable: false);
  }

  Future<void> upsertCustomer(LocalCustomerProjection customer) async {
    await _upsert(
      'local_customers',
      OfflineEntityMapper.customerToRow(customer),
    );
  }

  Future<LocalCustomerProjection?> getCustomer({
    required String tenantId,
    required String outletId,
    required String id,
  }) async {
    final row = await _getProjection(
      'local_customers',
      tenantId: tenantId,
      outletId: outletId,
      id: id,
    );
    return row == null ? null : OfflineEntityMapper.customerFromRow(row);
  }

  Future<List<LocalCustomerProjection>> listCustomers({
    required String tenantId,
    required String outletId,
  }) async {
    final rows = await _listProjections(
      'local_customers',
      tenantId: tenantId,
      outletId: outletId,
      orderBy: 'display_name COLLATE NOCASE ASC',
    );
    return rows
        .map(OfflineEntityMapper.customerFromRow)
        .toList(growable: false);
  }

  Future<void> upsertInventory(LocalInventoryProjection inventory) async {
    await _upsert(
      'local_inventory_items',
      OfflineEntityMapper.inventoryToRow(inventory),
    );
  }

  Future<LocalInventoryProjection?> getInventoryItem({
    required String tenantId,
    required String outletId,
    required String id,
  }) async {
    final row = await _getProjection(
      'local_inventory_items',
      tenantId: tenantId,
      outletId: outletId,
      id: id,
    );
    return row == null ? null : OfflineEntityMapper.inventoryFromRow(row);
  }

  Future<List<LocalInventoryProjection>> listInventoryItems({
    required String tenantId,
    required String outletId,
  }) async {
    final rows = await _listProjections(
      'local_inventory_items',
      tenantId: tenantId,
      outletId: outletId,
      orderBy: 'name COLLATE NOCASE ASC',
    );
    return rows
        .map(OfflineEntityMapper.inventoryFromRow)
        .toList(growable: false);
  }

  Future<void> _upsert(String table, Map<String, Object?> row) async {
    final database = await _database.open();
    await database.insert(
      table,
      row,
      conflictAlgorithm: sqlite.ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, Object?>?> _getProjection(
    String table, {
    required String tenantId,
    required String outletId,
    required String id,
  }) async {
    final database = await _database.open();
    final rows = await database.query(
      table,
      where: 'tenant_id = ? AND outlet_id = ? AND id = ?',
      whereArgs: [tenantId, outletId, id],
      limit: 1,
    );
    return rows.isEmpty ? null : rows.single;
  }

  Future<List<Map<String, Object?>>> _listProjections(
    String table, {
    required String tenantId,
    required String outletId,
    String? extraWhere,
    List<Object?> extraArgs = const [],
    String orderBy = 'updated_at DESC',
  }) async {
    final database = await _database.open();
    var where = 'tenant_id = ? AND outlet_id = ?';
    if (extraWhere != null) {
      where = '$where AND $extraWhere';
    }
    return database.query(
      table,
      where: where,
      whereArgs: [tenantId, outletId, ...extraArgs],
      orderBy: orderBy,
    );
  }
}
