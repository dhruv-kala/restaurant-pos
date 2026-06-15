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

  Future<void> appendQueuedChange({
    required SyncQueueItem queueItem,
    required LocalChangeLogEntry changeLogEntry,
  }) async {
    _validateQueueAndChangeLog(queueItem, changeLogEntry);
    final database = await _database.open();
    await database.transaction((transaction) async {
      await transaction.insert(
        'sync_queue',
        OfflineEntityMapper.syncQueueItemToRow(queueItem),
      );
      await transaction.insert(
        'local_change_log',
        OfflineEntityMapper.localChangeLogEntryToRow(changeLogEntry),
      );
    });
  }

  Future<void> appendSyncQueueItem(SyncQueueItem item) async {
    final database = await _database.open();
    await database.insert(
      'sync_queue',
      OfflineEntityMapper.syncQueueItemToRow(item),
    );
  }

  Future<void> appendLocalChange(LocalChangeLogEntry entry) async {
    final database = await _database.open();
    await database.insert(
      'local_change_log',
      OfflineEntityMapper.localChangeLogEntryToRow(entry),
    );
  }

  Future<SyncQueueItem?> getSyncQueueItem({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required String localId,
  }) async {
    final database = await _database.open();
    final rows = await database.query(
      'sync_queue',
      where:
          'tenant_id = ? AND outlet_id = ? AND device_id = ? AND local_id = ?',
      whereArgs: [tenantId, outletId, deviceId, localId],
      limit: 1,
    );
    return rows.isEmpty
        ? null
        : OfflineEntityMapper.syncQueueItemFromRow(rows.single);
  }

  Future<List<SyncQueueItem>> listSyncQueueItems({
    required String tenantId,
    required String outletId,
    required String deviceId,
    SyncQueueState? state,
    int limit = 100,
  }) async {
    final database = await _database.open();
    var where = 'tenant_id = ? AND outlet_id = ? AND device_id = ?';
    final whereArgs = <Object?>[tenantId, outletId, deviceId];
    if (state != null) {
      where = '$where AND state = ?';
      whereArgs.add(state.wireName);
    }
    final rows = await database.query(
      'sync_queue',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'created_at ASC',
      limit: limit,
    );
    return rows
        .map(OfflineEntityMapper.syncQueueItemFromRow)
        .toList(growable: false);
  }

  Future<List<LocalChangeLogEntry>> listLocalChanges({
    required String tenantId,
    required String outletId,
    required String deviceId,
    String? entityType,
    String? entityId,
    int limit = 100,
  }) async {
    final database = await _database.open();
    var where = 'tenant_id = ? AND outlet_id = ? AND device_id = ?';
    final whereArgs = <Object?>[tenantId, outletId, deviceId];
    if (entityType != null) {
      where = '$where AND entity_type = ?';
      whereArgs.add(entityType);
    }
    if (entityId != null) {
      where = '$where AND entity_id = ?';
      whereArgs.add(entityId);
    }
    final rows = await database.query(
      'local_change_log',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'created_at ASC',
      limit: limit,
    );
    return rows
        .map(OfflineEntityMapper.localChangeLogEntryFromRow)
        .toList(growable: false);
  }

  Future<void> recordSyncConflict(SyncConflict conflict) async {
    if (conflict.status != SyncConflictStatus.open) {
      throw ArgumentError('Newly recorded conflicts must be OPEN.');
    }

    final database = await _database.open();
    await database.transaction((transaction) async {
      await transaction.insert(
        'sync_conflicts',
        OfflineEntityMapper.syncConflictToRow(conflict),
      );
      await _updateQueueState(
        transaction,
        tenantId: conflict.tenantId,
        outletId: conflict.outletId,
        deviceId: conflict.deviceId,
        localId: conflict.queueItemId,
        state: SyncQueueState.conflict,
        updatedAt: conflict.detectedAt,
        errorCode: 'SYNC_CONFLICT',
        errorMessage: 'Synchronization conflict detected.',
      );
    });
  }

  Future<SyncConflict?> getSyncConflict({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required String id,
  }) async {
    final database = await _database.open();
    final rows = await database.query(
      'sync_conflicts',
      where: 'tenant_id = ? AND outlet_id = ? AND device_id = ? AND id = ?',
      whereArgs: [tenantId, outletId, deviceId, id],
      limit: 1,
    );
    return rows.isEmpty
        ? null
        : OfflineEntityMapper.syncConflictFromRow(rows.single);
  }

  Future<List<SyncConflict>> listSyncConflicts({
    required String tenantId,
    required String outletId,
    required String deviceId,
    SyncConflictStatus? status,
    int limit = 100,
  }) async {
    final database = await _database.open();
    var where = 'tenant_id = ? AND outlet_id = ? AND device_id = ?';
    final whereArgs = <Object?>[tenantId, outletId, deviceId];
    if (status != null) {
      where = '$where AND status = ?';
      whereArgs.add(status.wireName);
    }
    final rows = await database.query(
      'sync_conflicts',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'detected_at ASC',
      limit: limit,
    );
    return rows
        .map(OfflineEntityMapper.syncConflictFromRow)
        .toList(growable: false);
  }

  Future<SyncConflict> applyConflictResolution({
    required String conflictId,
    required String tenantId,
    required String outletId,
    required String deviceId,
    required SyncConflictResolutionStrategy strategy,
    required String decisionId,
    required String decidedByUserId,
    required DateTime decidedAt,
    String? notes,
  }) async {
    final database = await _database.open();
    late SyncConflict updatedConflict;

    await database.transaction((transaction) async {
      final rows = await transaction.query(
        'sync_conflicts',
        where: 'tenant_id = ? AND outlet_id = ? AND device_id = ? AND id = ?',
        whereArgs: [tenantId, outletId, deviceId, conflictId],
        limit: 1,
      );
      if (rows.isEmpty) {
        throw StateError('Sync conflict not found.');
      }

      final conflict = OfflineEntityMapper.syncConflictFromRow(rows.single);
      if (conflict.status != SyncConflictStatus.open) {
        throw StateError('Only open conflicts can be resolved.');
      }
      _validateConflictStrategy(conflict, strategy);

      final statusAfter = _statusAfter(strategy);
      final queueStateAfter = _queueStateAfter(strategy);
      final resolvedAt = statusAfter == SyncConflictStatus.resolved
          ? decidedAt
          : null;

      final resolutionEntry = LocalConflictResolutionEntry(
        id: decisionId,
        conflictId: conflict.id,
        tenantId: conflict.tenantId,
        outletId: conflict.outletId,
        deviceId: conflict.deviceId,
        strategy: strategy,
        statusAfter: statusAfter,
        queueStateAfter: queueStateAfter,
        decidedByUserId: decidedByUserId,
        decidedAt: decidedAt,
        notes: notes,
      );
      await transaction.insert(
        'sync_conflict_decisions',
        OfflineEntityMapper.conflictResolutionEntryToRow(resolutionEntry),
      );

      await transaction.update(
        'sync_conflicts',
        {
          'status': statusAfter.wireName,
          'resolution_strategy': strategy.wireName,
          'resolved_by_user_id': resolvedAt == null ? null : decidedByUserId,
          'resolved_at': resolvedAt?.toUtc().toIso8601String(),
          'resolution_notes': notes,
        },
        where: 'tenant_id = ? AND outlet_id = ? AND device_id = ? AND id = ?',
        whereArgs: [tenantId, outletId, deviceId, conflictId],
      );

      await _updateQueueState(
        transaction,
        tenantId: conflict.tenantId,
        outletId: conflict.outletId,
        deviceId: conflict.deviceId,
        localId: conflict.queueItemId,
        state: queueStateAfter,
        updatedAt: decidedAt,
        errorCode: statusAfter == SyncConflictStatus.open
            ? 'MANUAL_REVIEW_REQUIRED'
            : null,
        errorMessage: statusAfter == SyncConflictStatus.open
            ? 'Conflict requires manual review.'
            : null,
      );

      final updatedRows = await transaction.query(
        'sync_conflicts',
        where: 'tenant_id = ? AND outlet_id = ? AND device_id = ? AND id = ?',
        whereArgs: [tenantId, outletId, deviceId, conflictId],
        limit: 1,
      );
      updatedConflict = OfflineEntityMapper.syncConflictFromRow(
        updatedRows.single,
      );
    });

    return updatedConflict;
  }

  Future<List<LocalConflictResolutionEntry>> listConflictResolutionHistory({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required String conflictId,
  }) async {
    final database = await _database.open();
    final rows = await database.query(
      'sync_conflict_decisions',
      where:
          'tenant_id = ? AND outlet_id = ? AND device_id = ? AND conflict_id = ?',
      whereArgs: [tenantId, outletId, deviceId, conflictId],
      orderBy: 'decided_at ASC',
    );
    return rows
        .map(OfflineEntityMapper.conflictResolutionEntryFromRow)
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

  Future<void> _updateQueueState(
    sqlite.Transaction transaction, {
    required String tenantId,
    required String outletId,
    required String deviceId,
    required String localId,
    required SyncQueueState state,
    required DateTime updatedAt,
    String? errorCode,
    String? errorMessage,
  }) async {
    await transaction.update(
      'sync_queue',
      {
        'state': state.wireName,
        'updated_at': updatedAt.toUtc().toIso8601String(),
        'error_code': errorCode,
        'error_message': errorMessage,
      },
      where:
          'tenant_id = ? AND outlet_id = ? AND device_id = ? AND local_id = ?',
      whereArgs: [tenantId, outletId, deviceId, localId],
    );
  }

  void _validateConflictStrategy(
    SyncConflict conflict,
    SyncConflictResolutionStrategy strategy,
  ) {
    if (_financialEntityTypes.contains(conflict.entityType) &&
        strategy != SyncConflictResolutionStrategy.manualReview) {
      throw StateError(
        'Financial conflicts require manual review and cannot be auto-resolved.',
      );
    }
  }

  SyncConflictStatus _statusAfter(SyncConflictResolutionStrategy strategy) =>
      switch (strategy) {
        SyncConflictResolutionStrategy.manualReview => SyncConflictStatus.open,
        _ => SyncConflictStatus.resolved,
      };

  SyncQueueState _queueStateAfter(SyncConflictResolutionStrategy strategy) =>
      switch (strategy) {
        SyncConflictResolutionStrategy.serverAuthority =>
          SyncQueueState.success,
        SyncConflictResolutionStrategy.lastWriteWins => SyncQueueState.pending,
        SyncConflictResolutionStrategy.manualReview => SyncQueueState.conflict,
        SyncConflictResolutionStrategy.businessRule => SyncQueueState.pending,
      };

  void _validateQueueAndChangeLog(
    SyncQueueItem queueItem,
    LocalChangeLogEntry changeLogEntry,
  ) {
    final matchingScope =
        queueItem.localId == changeLogEntry.queueItemLocalId &&
        queueItem.tenantId == changeLogEntry.tenantId &&
        queueItem.outletId == changeLogEntry.outletId &&
        queueItem.deviceId == changeLogEntry.deviceId &&
        queueItem.actorUserId == changeLogEntry.actorUserId &&
        queueItem.module == changeLogEntry.module &&
        queueItem.entityType == changeLogEntry.entityType &&
        queueItem.entityId == changeLogEntry.entityId &&
        queueItem.operationType == changeLogEntry.operationType;
    if (!matchingScope) {
      throw ArgumentError(
        'Queue item and local change log entry must describe the same change.',
      );
    }
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

const _financialEntityTypes = {
  'Bill',
  'Payment',
  'Receipt',
  'Invoice',
  'TaxInvoice',
  'CashDrawer',
  'CashDrawerTransaction',
  'BusinessDayClosing',
  'ShiftReconciliation',
  'InventoryMovement',
  'StockMovement',
};
