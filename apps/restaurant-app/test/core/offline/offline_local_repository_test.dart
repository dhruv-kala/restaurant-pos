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
}

SyncQueueItem _queueItem({
  required String localId,
  required SyncOperationType operationType,
  required DateTime businessDate,
  required DateTime occurredAt,
}) => SyncQueueItem(
  localId: localId,
  tenantId: 'tenant-1',
  outletId: 'outlet-1',
  deviceId: 'device-1',
  actorUserId: 'user-1',
  module: 'orders',
  entityType: 'Order',
  entityId: 'order-local-1',
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
