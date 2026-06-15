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

  Future<void> upsertPayment(LocalPaymentProjection payment) async {
    await _upsert('local_payments', OfflineEntityMapper.paymentToRow(payment));
  }

  Future<LocalPaymentProjection?> getPayment({
    required String tenantId,
    required String outletId,
    required String id,
  }) async {
    final row = await _getProjection(
      'local_payments',
      tenantId: tenantId,
      outletId: outletId,
      id: id,
    );
    return row == null ? null : OfflineEntityMapper.paymentFromRow(row);
  }

  Future<List<LocalPaymentProjection>> listPayments({
    required String tenantId,
    required String outletId,
    String? billId,
    DateTime? businessDate,
  }) async {
    final filters = <String>[];
    final args = <Object?>[];
    if (billId != null) {
      filters.add('bill_id = ?');
      args.add(billId);
    }
    if (businessDate != null) {
      filters.add('business_date = ?');
      args.add(businessDate.toUtc().toIso8601String());
    }
    final rows = await _listProjections(
      'local_payments',
      tenantId: tenantId,
      outletId: outletId,
      extraWhere: filters.isEmpty ? null : filters.join(' AND '),
      extraArgs: args,
    );
    return rows.map(OfflineEntityMapper.paymentFromRow).toList(growable: false);
  }

  Future<void> upsertReceipt(LocalReceiptProjection receipt) async {
    await _upsert('local_receipts', OfflineEntityMapper.receiptToRow(receipt));
  }

  Future<LocalReceiptProjection?> getReceipt({
    required String tenantId,
    required String outletId,
    required String id,
  }) async {
    final row = await _getProjection(
      'local_receipts',
      tenantId: tenantId,
      outletId: outletId,
      id: id,
    );
    return row == null ? null : OfflineEntityMapper.receiptFromRow(row);
  }

  Future<List<LocalReceiptProjection>> listReceipts({
    required String tenantId,
    required String outletId,
    String? billId,
    DateTime? businessDate,
  }) async {
    final filters = <String>[];
    final args = <Object?>[];
    if (billId != null) {
      filters.add('bill_id = ?');
      args.add(billId);
    }
    if (businessDate != null) {
      filters.add('business_date = ?');
      args.add(businessDate.toUtc().toIso8601String());
    }
    final rows = await _listProjections(
      'local_receipts',
      tenantId: tenantId,
      outletId: outletId,
      extraWhere: filters.isEmpty ? null : filters.join(' AND '),
      extraArgs: args,
    );
    return rows.map(OfflineEntityMapper.receiptFromRow).toList(growable: false);
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

  Future<List<LocalCustomerProjection>> searchCustomers({
    required String tenantId,
    required String outletId,
    required String query,
  }) async {
    final normalizedQuery = query.trim();
    if (normalizedQuery.isEmpty) {
      return listCustomers(tenantId: tenantId, outletId: outletId);
    }
    final likeQuery = '%$normalizedQuery%';
    final rows = await _listProjections(
      'local_customers',
      tenantId: tenantId,
      outletId: outletId,
      extraWhere:
          '(display_name LIKE ? COLLATE NOCASE OR phone LIKE ? OR email LIKE ? COLLATE NOCASE)',
      extraArgs: [likeQuery, likeQuery, likeQuery],
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

  Future<List<LocalInventoryProjection>> searchInventoryItems({
    required String tenantId,
    required String outletId,
    required String query,
  }) async {
    final normalizedQuery = query.trim();
    if (normalizedQuery.isEmpty) {
      return listInventoryItems(tenantId: tenantId, outletId: outletId);
    }
    final likeQuery = '%$normalizedQuery%';
    final rows = await _listProjections(
      'local_inventory_items',
      tenantId: tenantId,
      outletId: outletId,
      extraWhere: '(name LIKE ? COLLATE NOCASE OR sku LIKE ? COLLATE NOCASE)',
      extraArgs: [likeQuery, likeQuery],
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

  Future<void> upsertOrderAndAppendChange({
    required LocalOrderProjection order,
    required SyncQueueItem queueItem,
    required LocalChangeLogEntry changeLogEntry,
  }) async {
    _validateQueueAndChangeLog(queueItem, changeLogEntry);
    await _upsertRowsAndAppendChange(
      projectionTable: 'local_orders',
      projectionRow: OfflineEntityMapper.orderToRow(order),
      queueItem: queueItem,
      changeLogEntry: changeLogEntry,
    );
  }

  Future<void> upsertBillAndAppendChange({
    required LocalBillProjection bill,
    required SyncQueueItem queueItem,
    required LocalChangeLogEntry changeLogEntry,
  }) async {
    _validateQueueAndChangeLog(queueItem, changeLogEntry);
    await _upsertRowsAndAppendChange(
      projectionTable: 'local_bills',
      projectionRow: OfflineEntityMapper.billToRow(bill),
      queueItem: queueItem,
      changeLogEntry: changeLogEntry,
    );
  }

  Future<void> upsertPaymentAndAppendChange({
    required LocalPaymentProjection payment,
    required SyncQueueItem queueItem,
    required LocalChangeLogEntry changeLogEntry,
    LocalBillProjection? updatedBill,
  }) async {
    _validateQueueAndChangeLog(queueItem, changeLogEntry);
    await _upsertRowsAndAppendChange(
      projectionTable: 'local_payments',
      projectionRow: OfflineEntityMapper.paymentToRow(payment),
      queueItem: queueItem,
      changeLogEntry: changeLogEntry,
      additionalRows: updatedBill == null
          ? const []
          : [
              _OfflineProjectionWrite(
                table: 'local_bills',
                row: OfflineEntityMapper.billToRow(updatedBill),
              ),
            ],
    );
  }

  Future<void> upsertReceiptAndAppendChange({
    required LocalReceiptProjection receipt,
    required SyncQueueItem queueItem,
    required LocalChangeLogEntry changeLogEntry,
  }) async {
    _validateQueueAndChangeLog(queueItem, changeLogEntry);
    await _upsertRowsAndAppendChange(
      projectionTable: 'local_receipts',
      projectionRow: OfflineEntityMapper.receiptToRow(receipt),
      queueItem: queueItem,
      changeLogEntry: changeLogEntry,
    );
  }

  Future<void> upsertCustomerAndAppendChange({
    required LocalCustomerProjection customer,
    required SyncQueueItem queueItem,
    required LocalChangeLogEntry changeLogEntry,
  }) async {
    _validateQueueAndChangeLog(queueItem, changeLogEntry);
    await _upsertRowsAndAppendChange(
      projectionTable: 'local_customers',
      projectionRow: OfflineEntityMapper.customerToRow(customer),
      queueItem: queueItem,
      changeLogEntry: changeLogEntry,
    );
  }

  Future<void> upsertInventoryAndAppendChange({
    required LocalInventoryProjection inventory,
    required SyncQueueItem queueItem,
    required LocalChangeLogEntry changeLogEntry,
  }) async {
    _validateQueueAndChangeLog(queueItem, changeLogEntry);
    await _upsertRowsAndAppendChange(
      projectionTable: 'local_inventory_items',
      projectionRow: OfflineEntityMapper.inventoryToRow(inventory),
      queueItem: queueItem,
      changeLogEntry: changeLogEntry,
    );
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

  Future<List<SyncQueueItem>> listSyncQueueItemsByStates({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required Set<SyncQueueState> states,
    int limit = 100,
  }) async {
    if (states.isEmpty) return const [];
    final database = await _database.open();
    final placeholders = List.filled(states.length, '?').join(', ');
    final rows = await database.query(
      'sync_queue',
      where:
          'tenant_id = ? AND outlet_id = ? AND device_id = ? AND state IN ($placeholders)',
      whereArgs: [
        tenantId,
        outletId,
        deviceId,
        ...states.map((state) => state.wireName),
      ],
      orderBy: 'updated_at ASC',
      limit: limit,
    );
    return rows
        .map(OfflineEntityMapper.syncQueueItemFromRow)
        .toList(growable: false);
  }

  Future<Map<SyncQueueState, int>> countSyncQueueItemsByState({
    required String tenantId,
    required String outletId,
    required String deviceId,
  }) async {
    final database = await _database.open();
    final rows = await database.rawQuery(
      'SELECT state, COUNT(*) AS count FROM sync_queue '
      'WHERE tenant_id = ? AND outlet_id = ? AND device_id = ? '
      'GROUP BY state',
      [tenantId, outletId, deviceId],
    );
    final counts = {for (final state in SyncQueueState.values) state: 0};
    for (final row in rows) {
      final state = SyncQueueState.fromJson(row['state']);
      final value = row['count'];
      counts[state] = value is int
          ? value
          : value is num
          ? value.toInt()
          : 0;
    }
    return counts;
  }

  Future<List<SyncQueueItem>> claimRetryableSyncQueueItems({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required DateTime now,
    int limit = 25,
    int maxAttempts = 5,
  }) async {
    final database = await _database.open();
    final nowIso = now.toUtc().toIso8601String();
    return database.transaction((transaction) async {
      final rows = await transaction.query(
        'sync_queue',
        where: '''
tenant_id = ? AND outlet_id = ? AND device_id = ?
AND attempt_count < ?
AND (
  state = ?
  OR (state = ? AND (next_retry_at IS NULL OR next_retry_at <= ?))
)
''',
        whereArgs: [
          tenantId,
          outletId,
          deviceId,
          maxAttempts,
          SyncQueueState.pending.wireName,
          SyncQueueState.retrying.wireName,
          nowIso,
        ],
        orderBy: 'created_at ASC',
        limit: limit,
      );

      final claimed = <SyncQueueItem>[];
      for (final row in rows) {
        final item = OfflineEntityMapper.syncQueueItemFromRow(row);
        final nextAttemptCount = item.attemptCount + 1;
        await transaction.update(
          'sync_queue',
          {
            'state': SyncQueueState.inProgress.wireName,
            'attempt_count': nextAttemptCount,
            'last_attempt_at': nowIso,
            'next_retry_at': null,
            'updated_at': nowIso,
            'error_code': null,
            'error_message': null,
          },
          where:
              'tenant_id = ? AND outlet_id = ? AND device_id = ? AND local_id = ? '
              'AND state IN (?, ?)',
          whereArgs: [
            tenantId,
            outletId,
            deviceId,
            item.localId,
            SyncQueueState.pending.wireName,
            SyncQueueState.retrying.wireName,
          ],
        );
        claimed.add(
          SyncQueueItem(
            localId: item.localId,
            tenantId: item.tenantId,
            outletId: item.outletId,
            deviceId: item.deviceId,
            actorUserId: item.actorUserId,
            module: item.module,
            entityType: item.entityType,
            entityId: item.entityId,
            operationType: item.operationType,
            idempotencyKey: item.idempotencyKey,
            businessDate: item.businessDate,
            occurredAt: item.occurredAt,
            payload: item.payload,
            state: SyncQueueState.inProgress,
            attemptCount: nextAttemptCount,
            createdAt: item.createdAt,
            updatedAt: now,
            baseVersion: item.baseVersion,
            lastAttemptAt: now,
          ),
        );
      }
      return claimed;
    });
  }

  Future<void> markSyncQueueItemSuccess({
    required SyncQueueItem item,
    required DateTime completedAt,
  }) async {
    final database = await _database.open();
    await database.transaction((transaction) async {
      await _updateQueueState(
        transaction,
        tenantId: item.tenantId,
        outletId: item.outletId,
        deviceId: item.deviceId,
        localId: item.localId,
        state: SyncQueueState.success,
        updatedAt: completedAt,
      );
    });
  }

  Future<void> markSyncQueueItemRetrying({
    required SyncQueueItem item,
    required DateTime updatedAt,
    required DateTime nextRetryAt,
    String? errorCode,
    String? errorMessage,
  }) async {
    final database = await _database.open();
    await database.transaction((transaction) async {
      await transaction.update(
        'sync_queue',
        {
          'state': SyncQueueState.retrying.wireName,
          'next_retry_at': nextRetryAt.toUtc().toIso8601String(),
          'updated_at': updatedAt.toUtc().toIso8601String(),
          'error_code': errorCode,
          'error_message': errorMessage,
        },
        where:
            'tenant_id = ? AND outlet_id = ? AND device_id = ? AND local_id = ?',
        whereArgs: [item.tenantId, item.outletId, item.deviceId, item.localId],
      );
    });
  }

  Future<void> markSyncQueueItemFailed({
    required SyncQueueItem item,
    required DateTime failedAt,
    String? errorCode,
    String? errorMessage,
  }) async {
    final database = await _database.open();
    await database.transaction((transaction) async {
      await _updateQueueState(
        transaction,
        tenantId: item.tenantId,
        outletId: item.outletId,
        deviceId: item.deviceId,
        localId: item.localId,
        state: SyncQueueState.failed,
        updatedAt: failedAt,
        errorCode: errorCode,
        errorMessage: errorMessage,
      );
    });
  }

  Future<void> insertSyncBatch(SyncBatch batch) async {
    final database = await _database.open();
    await database.insert(
      'sync_batches',
      OfflineEntityMapper.syncBatchToRow(batch),
    );
  }

  Future<void> completeSyncBatch({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required String batchId,
    required SyncQueueState state,
    required DateTime completedAt,
  }) async {
    final database = await _database.open();
    await database.update(
      'sync_batches',
      {
        'state': state.wireName,
        'completed_at': completedAt.toUtc().toIso8601String(),
      },
      where: 'tenant_id = ? AND outlet_id = ? AND device_id = ? AND id = ?',
      whereArgs: [tenantId, outletId, deviceId, batchId],
    );
  }

  Future<List<SyncBatch>> listSyncBatches({
    required String tenantId,
    required String outletId,
    required String deviceId,
    int limit = 50,
  }) async {
    final database = await _database.open();
    final rows = await database.query(
      'sync_batches',
      where: 'tenant_id = ? AND outlet_id = ? AND device_id = ?',
      whereArgs: [tenantId, outletId, deviceId],
      orderBy: 'created_at DESC',
      limit: limit,
    );
    return rows
        .map(OfflineEntityMapper.syncBatchFromRow)
        .toList(growable: false);
  }

  Future<List<SyncCheckpoint>> listSyncCheckpoints({
    required String tenantId,
    required String outletId,
    required String deviceId,
  }) async {
    final database = await _database.open();
    final rows = await database.query(
      'sync_checkpoints',
      where: 'tenant_id = ? AND outlet_id = ? AND device_id = ?',
      whereArgs: [tenantId, outletId, deviceId],
      orderBy: 'module ASC',
    );
    return rows
        .map(OfflineEntityMapper.syncCheckpointFromRow)
        .toList(growable: false);
  }

  Future<void> upsertSyncCheckpoint(SyncCheckpoint checkpoint) async {
    final database = await _database.open();
    await database.insert(
      'sync_checkpoints',
      OfflineEntityMapper.syncCheckpointToRow(checkpoint),
      conflictAlgorithm: sqlite.ConflictAlgorithm.replace,
    );
  }

  Future<SyncCheckpoint?> getSyncCheckpoint({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required String module,
  }) async {
    final database = await _database.open();
    final rows = await database.query(
      'sync_checkpoints',
      where: 'tenant_id = ? AND outlet_id = ? AND device_id = ? AND module = ?',
      whereArgs: [tenantId, outletId, deviceId, module],
      limit: 1,
    );
    return rows.isEmpty
        ? null
        : OfflineEntityMapper.syncCheckpointFromRow(rows.single);
  }

  Future<void> updateDeviceSyncStateCounters({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required DateTime updatedAt,
    DateTime? lastPushedAt,
    DateTime? lastPulledAt,
    String? lastPullCursor,
    bool? isOnline,
  }) async {
    final database = await _database.open();
    final state = await getDeviceSyncState(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
    );
    if (state == null) return;

    final pendingCount = await _countQueueStates(
      database,
      tenantId,
      outletId,
      deviceId,
      {SyncQueueState.pending, SyncQueueState.retrying},
    );
    final failedCount = await _countQueueStates(
      database,
      tenantId,
      outletId,
      deviceId,
      {SyncQueueState.failed},
    );
    final conflictCount = await _countQueueStates(
      database,
      tenantId,
      outletId,
      deviceId,
      {SyncQueueState.conflict},
    );

    await upsertDeviceSyncState(
      DeviceSyncState(
        tenantId: state.tenantId,
        outletId: state.outletId,
        deviceId: state.deviceId,
        userId: state.userId,
        syncEnabled: state.syncEnabled,
        isOnline: isOnline ?? state.isOnline,
        pendingCount: pendingCount,
        failedCount: failedCount,
        conflictCount: conflictCount,
        updatedAt: updatedAt,
        trustedSessionId: state.trustedSessionId,
        lastPullCursor: lastPullCursor ?? state.lastPullCursor,
        lastPushedAt: lastPushedAt ?? state.lastPushedAt,
        lastPulledAt: lastPulledAt ?? state.lastPulledAt,
      ),
    );
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

  Future<int> retrySyncQueueItems({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required Iterable<String> localIds,
    required DateTime retriedAt,
    bool resetAttemptCount = true,
  }) async {
    final ids = localIds.toSet();
    if (ids.isEmpty) return 0;
    final database = await _database.open();
    final placeholders = List.filled(ids.length, '?').join(', ');
    return database.update(
      'sync_queue',
      {
        'state': SyncQueueState.pending.wireName,
        if (resetAttemptCount) 'attempt_count': 0,
        'last_attempt_at': null,
        'next_retry_at': null,
        'error_code': null,
        'error_message': null,
        'updated_at': retriedAt.toUtc().toIso8601String(),
      },
      where:
          'tenant_id = ? AND outlet_id = ? AND device_id = ? '
          'AND local_id IN ($placeholders) '
          'AND state IN (?, ?)',
      whereArgs: [
        tenantId,
        outletId,
        deviceId,
        ...ids,
        SyncQueueState.failed.wireName,
        SyncQueueState.retrying.wireName,
      ],
    );
  }

  Future<int> recoverStaleInProgressQueueItems({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required DateTime staleBefore,
    required DateTime recoveredAt,
  }) async {
    final database = await _database.open();
    return database.update(
      'sync_queue',
      {
        'state': SyncQueueState.retrying.wireName,
        'next_retry_at': recoveredAt.toUtc().toIso8601String(),
        'error_code': 'SYNC_RECOVERED_STALE_IN_PROGRESS',
        'error_message': 'Recovered stale in-progress sync item.',
        'updated_at': recoveredAt.toUtc().toIso8601String(),
      },
      where:
          'tenant_id = ? AND outlet_id = ? AND device_id = ? '
          'AND state = ? AND updated_at <= ?',
      whereArgs: [
        tenantId,
        outletId,
        deviceId,
        SyncQueueState.inProgress.wireName,
        staleBefore.toUtc().toIso8601String(),
      ],
    );
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

  Future<void> _upsertRowsAndAppendChange({
    required String projectionTable,
    required Map<String, Object?> projectionRow,
    required SyncQueueItem queueItem,
    required LocalChangeLogEntry changeLogEntry,
    List<_OfflineProjectionWrite> additionalRows = const [],
  }) async {
    final database = await _database.open();
    await database.transaction((transaction) async {
      await transaction.insert(
        projectionTable,
        projectionRow,
        conflictAlgorithm: sqlite.ConflictAlgorithm.replace,
      );
      for (final write in additionalRows) {
        await transaction.insert(
          write.table,
          write.row,
          conflictAlgorithm: sqlite.ConflictAlgorithm.replace,
        );
      }
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

  Future<int> _countQueueStates(
    sqlite.Database database,
    String tenantId,
    String outletId,
    String deviceId,
    Set<SyncQueueState> states,
  ) async {
    final placeholders = List.filled(states.length, '?').join(', ');
    final rows = await database.rawQuery(
      'SELECT COUNT(*) AS count FROM sync_queue '
      'WHERE tenant_id = ? AND outlet_id = ? AND device_id = ? '
      'AND state IN ($placeholders)',
      [tenantId, outletId, deviceId, ...states.map((state) => state.wireName)],
    );
    final value = rows.single['count'];
    if (value is int) return value;
    if (value is num) return value.toInt();
    return 0;
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

class _OfflineProjectionWrite {
  const _OfflineProjectionWrite({required this.table, required this.row});

  final String table;
  final Map<String, Object?> row;
}
