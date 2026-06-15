import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_app/core/offline/local_database.dart';
import 'package:restaurant_app/core/offline/offline_local_models.dart';
import 'package:restaurant_app/core/offline/offline_local_repository.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);

  test('persists scoped offline projections across database reopen', () async {
    final directory = await Directory.systemTemp.createTemp(
      'restaurant-pos-offline-',
    );
    final databasePath = '${directory.path}/offline.db';
    final timestamp = DateTime.utc(2026, 6, 15, 9);
    final businessDate = DateTime.utc(2026, 6, 15);

    final database = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final repository = OfflineLocalRepository(database);

    await repository.upsertDeviceSyncState(
      DeviceSyncState(
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        userId: 'user-1',
        trustedSessionId: 'session-1',
        syncEnabled: true,
        isOnline: false,
        lastPullCursor: 'cursor-1',
        pendingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        updatedAt: timestamp,
      ),
    );
    await repository.upsertOrder(
      LocalOrderProjection(
        id: 'order-local-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        businessDate: businessDate,
        orderNumber: 'O-1',
        status: 'OPEN',
        updatedAt: timestamp,
        payload: const {'tableId': 'table-1'},
      ),
    );
    await repository.upsertBill(
      LocalBillProjection(
        id: 'bill-local-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        businessDate: businessDate,
        orderId: 'order-local-1',
        billNumber: 'B-1',
        status: 'DRAFT',
        totalMinor: 125000,
        currencyCode: 'INR',
        updatedAt: timestamp,
        payload: const {'lineCount': 2},
      ),
    );
    await repository.upsertCustomer(
      LocalCustomerProjection(
        id: 'customer-local-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        displayName: 'Asha Patel',
        phone: '+919999999999',
        updatedAt: timestamp,
        payload: const {'loyaltyTier': 'GOLD'},
      ),
    );
    await repository.upsertInventory(
      LocalInventoryProjection(
        id: 'inventory-local-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        sku: 'RICE-01',
        name: 'Rice',
        quantity: 12.5,
        unitCode: 'KG',
        updatedAt: timestamp,
        payload: const {'batchTracked': true},
      ),
    );

    await database.close();

    final reopenedDatabase = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final reopenedRepository = OfflineLocalRepository(reopenedDatabase);

    final syncState = await reopenedRepository.getDeviceSyncState(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
    );
    final order = await reopenedRepository.getOrder(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      id: 'order-local-1',
    );
    final bill = await reopenedRepository.getBill(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      id: 'bill-local-1',
    );
    final customer = await reopenedRepository.getCustomer(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      id: 'customer-local-1',
    );
    final inventory = await reopenedRepository.getInventoryItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      id: 'inventory-local-1',
    );

    expect(syncState?.lastPullCursor, 'cursor-1');
    expect(order?.payload['tableId'], 'table-1');
    expect(bill?.totalMinor, 125000);
    expect(customer?.phone, '+919999999999');
    expect(inventory?.quantity, 12.5);

    final otherTenantOrders = await reopenedRepository.listOrders(
      tenantId: 'tenant-2',
      outletId: 'outlet-1',
      businessDate: businessDate,
    );
    expect(otherTenantOrders, isEmpty);

    await reopenedDatabase.close();
    await directory.delete(recursive: true);
  });

  test('appends recoverable sync queue and change log entries', () async {
    final directory = await Directory.systemTemp.createTemp(
      'restaurant-pos-sync-queue-',
    );
    final databasePath = '${directory.path}/offline.db';
    final timestamp = DateTime.utc(2026, 6, 15, 10);
    final businessDate = DateTime.utc(2026, 6, 15);

    final database = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final repository = OfflineLocalRepository(database);

    final operations = [
      SyncOperationType.create,
      SyncOperationType.update,
      SyncOperationType.delete,
    ];

    for (final (index, operation) in operations.indexed) {
      final queueItem = _queueItem(
        localId: 'queue-$index',
        operationType: operation,
        businessDate: businessDate,
        occurredAt: timestamp.add(Duration(minutes: index)),
      );
      await repository.appendQueuedChange(
        queueItem: queueItem,
        changeLogEntry: _changeLogEntry(
          id: 'change-$index',
          queueItem: queueItem,
        ),
      );
    }

    await database.close();

    final reopenedDatabase = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final reopenedRepository = OfflineLocalRepository(reopenedDatabase);

    final pendingQueue = await reopenedRepository.listSyncQueueItems(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      state: SyncQueueState.pending,
    );
    final changes = await reopenedRepository.listLocalChanges(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      entityType: 'Order',
      entityId: 'order-local-1',
    );

    expect(pendingQueue.map((item) => item.operationType), operations);
    expect(changes.map((entry) => entry.operationType), operations);
    expect(
      pendingQueue.singleWhere((item) => item.localId == 'queue-0').payload,
      {'status': 'CREATE'},
    );

    final duplicateItem = _queueItem(
      localId: 'queue-0',
      operationType: SyncOperationType.create,
      businessDate: businessDate,
      occurredAt: timestamp,
    );
    await expectLater(
      reopenedRepository.appendQueuedChange(
        queueItem: duplicateItem,
        changeLogEntry: _changeLogEntry(
          id: 'duplicate-change',
          queueItem: duplicateItem,
        ),
      ),
      throwsA(isA<Exception>()),
    );

    final otherTenantQueue = await reopenedRepository.listSyncQueueItems(
      tenantId: 'tenant-2',
      outletId: 'outlet-1',
      deviceId: 'device-1',
    );
    expect(otherTenantQueue, isEmpty);

    await reopenedDatabase.close();
    await directory.delete(recursive: true);
  });

  test('records and resolves sync conflicts safely', () async {
    final directory = await Directory.systemTemp.createTemp(
      'restaurant-pos-conflicts-',
    );
    final databasePath = '${directory.path}/offline.db';
    final timestamp = DateTime.utc(2026, 6, 15, 11);
    final businessDate = DateTime.utc(2026, 6, 15);

    final database = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    final repository = OfflineLocalRepository(database);

    final queueItem = _queueItem(
      localId: 'queue-conflict-1',
      operationType: SyncOperationType.update,
      businessDate: businessDate,
      occurredAt: timestamp,
    );
    await repository.appendQueuedChange(
      queueItem: queueItem,
      changeLogEntry: _changeLogEntry(
        id: 'change-conflict-1',
        queueItem: queueItem,
      ),
    );

    await repository.recordSyncConflict(
      _conflict(id: 'conflict-1', queueItem: queueItem, detectedAt: timestamp),
    );

    final openConflicts = await repository.listSyncConflicts(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      status: SyncConflictStatus.open,
    );
    final conflictedQueue = await repository.getSyncQueueItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localId: queueItem.localId,
    );

    expect(openConflicts.single.id, 'conflict-1');
    expect(conflictedQueue?.state, SyncQueueState.conflict);

    final clientWinsConflict = await repository.applyConflictResolution(
      conflictId: 'conflict-1',
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      strategy: SyncConflictResolutionStrategy.lastWriteWins,
      decisionId: 'decision-client-wins',
      decidedByUserId: 'manager-1',
      decidedAt: timestamp.add(const Duration(minutes: 1)),
      notes: 'Local waiter edit is authoritative.',
    );
    final clientWinsQueue = await repository.getSyncQueueItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localId: queueItem.localId,
    );
    final decisions = await repository.listConflictResolutionHistory(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      conflictId: 'conflict-1',
    );

    expect(clientWinsConflict.status, SyncConflictStatus.resolved);
    expect(
      clientWinsConflict.resolutionStrategy,
      SyncConflictResolutionStrategy.lastWriteWins,
    );
    expect(clientWinsQueue?.state, SyncQueueState.pending);
    expect(
      decisions.single.strategy,
      SyncConflictResolutionStrategy.lastWriteWins,
    );

    final serverQueueItem = _queueItem(
      localId: 'queue-conflict-2',
      operationType: SyncOperationType.update,
      businessDate: businessDate,
      occurredAt: timestamp.add(const Duration(minutes: 2)),
    );
    await repository.appendQueuedChange(
      queueItem: serverQueueItem,
      changeLogEntry: _changeLogEntry(
        id: 'change-conflict-2',
        queueItem: serverQueueItem,
      ),
    );
    await repository.recordSyncConflict(
      _conflict(
        id: 'conflict-2',
        queueItem: serverQueueItem,
        detectedAt: timestamp.add(const Duration(minutes: 2)),
      ),
    );

    await repository.applyConflictResolution(
      conflictId: 'conflict-2',
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      strategy: SyncConflictResolutionStrategy.serverAuthority,
      decisionId: 'decision-server-wins',
      decidedByUserId: 'manager-1',
      decidedAt: timestamp.add(const Duration(minutes: 3)),
    );
    final serverWinsQueue = await repository.getSyncQueueItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localId: serverQueueItem.localId,
    );
    expect(serverWinsQueue?.state, SyncQueueState.success);

    final billQueueItem = _queueItem(
      localId: 'queue-conflict-bill',
      operationType: SyncOperationType.update,
      businessDate: businessDate,
      occurredAt: timestamp.add(const Duration(minutes: 4)),
      entityType: 'Bill',
      entityId: 'bill-local-1',
    );
    await repository.appendQueuedChange(
      queueItem: billQueueItem,
      changeLogEntry: _changeLogEntry(
        id: 'change-conflict-bill',
        queueItem: billQueueItem,
      ),
    );
    await repository.recordSyncConflict(
      _conflict(
        id: 'conflict-bill',
        queueItem: billQueueItem,
        detectedAt: timestamp.add(const Duration(minutes: 4)),
      ),
    );

    await expectLater(
      repository.applyConflictResolution(
        conflictId: 'conflict-bill',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        strategy: SyncConflictResolutionStrategy.serverAuthority,
        decisionId: 'decision-bill-server',
        decidedByUserId: 'manager-1',
        decidedAt: timestamp.add(const Duration(minutes: 5)),
      ),
      throwsA(isA<StateError>()),
    );

    final manualReviewConflict = await repository.applyConflictResolution(
      conflictId: 'conflict-bill',
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      strategy: SyncConflictResolutionStrategy.manualReview,
      decisionId: 'decision-bill-manual',
      decidedByUserId: 'manager-1',
      decidedAt: timestamp.add(const Duration(minutes: 6)),
      notes: 'Bill conflict requires explicit back-office review.',
    );
    final manualReviewQueue = await repository.getSyncQueueItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localId: billQueueItem.localId,
    );

    expect(manualReviewConflict.status, SyncConflictStatus.open);
    expect(
      manualReviewConflict.resolutionStrategy,
      SyncConflictResolutionStrategy.manualReview,
    );
    expect(manualReviewQueue?.state, SyncQueueState.conflict);

    await database.close();
    await directory.delete(recursive: true);
  });
}

SyncQueueItem _queueItem({
  required String localId,
  required SyncOperationType operationType,
  required DateTime businessDate,
  required DateTime occurredAt,
  String entityType = 'Order',
  String entityId = 'order-local-1',
}) => SyncQueueItem(
  localId: localId,
  tenantId: 'tenant-1',
  outletId: 'outlet-1',
  deviceId: 'device-1',
  actorUserId: 'user-1',
  module: 'orders',
  entityType: entityType,
  entityId: entityId,
  operationType: operationType,
  idempotencyKey: 'idempotency-$localId',
  businessDate: businessDate,
  occurredAt: occurredAt,
  payload: {'status': operationType.wireName},
  state: SyncQueueState.pending,
  attemptCount: 0,
  createdAt: occurredAt,
  updatedAt: occurredAt,
);

LocalChangeLogEntry _changeLogEntry({
  required String id,
  required SyncQueueItem queueItem,
}) => LocalChangeLogEntry(
  id: id,
  queueItemLocalId: queueItem.localId,
  tenantId: queueItem.tenantId,
  outletId: queueItem.outletId,
  deviceId: queueItem.deviceId,
  actorUserId: queueItem.actorUserId,
  module: queueItem.module,
  entityType: queueItem.entityType,
  entityId: queueItem.entityId,
  operationType: queueItem.operationType,
  businessDate: queueItem.businessDate,
  occurredAt: queueItem.occurredAt,
  payload: queueItem.payload,
  createdAt: queueItem.createdAt,
);

SyncConflict _conflict({
  required String id,
  required SyncQueueItem queueItem,
  required DateTime detectedAt,
}) => SyncConflict(
  id: id,
  tenantId: queueItem.tenantId,
  outletId: queueItem.outletId,
  deviceId: queueItem.deviceId,
  queueItemId: queueItem.localId,
  entityType: queueItem.entityType,
  entityId: queueItem.entityId,
  status: SyncConflictStatus.open,
  detectedAt: detectedAt,
  localPayload: queueItem.payload,
  serverPayload: {...queueItem.payload, 'serverVersion': true},
);
