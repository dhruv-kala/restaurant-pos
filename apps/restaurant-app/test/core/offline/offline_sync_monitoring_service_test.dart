import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_app/core/offline/local_database.dart';
import 'package:restaurant_app/core/offline/offline_local_models.dart';
import 'package:restaurant_app/core/offline/offline_local_repository.dart';
import 'package:restaurant_app/core/offline/offline_sync_monitoring_service.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);

  test(
    'reports sync health from queue, batches, checkpoints, and conflicts',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'restaurant-pos-sync-health-',
      );
      final database = OfflineLocalDatabase(
        databaseFactory: databaseFactoryFfi,
        databasePath: '${directory.path}/offline.db',
      );
      final repository = OfflineLocalRepository(database);
      final service = OfflineSyncMonitoringService(repository: repository);
      final now = DateTime.utc(2026, 6, 15, 18);

      await repository.upsertDeviceSyncState(_deviceState(updatedAt: now));
      final pending = _queueItem(
        localId: 'queue-pending',
        state: SyncQueueState.pending,
        updatedAt: now.subtract(const Duration(minutes: 2)),
      );
      final retrying = _queueItem(
        localId: 'queue-retrying',
        state: SyncQueueState.retrying,
        updatedAt: now.subtract(const Duration(minutes: 4)),
        attemptCount: 2,
        nextRetryAt: now.add(const Duration(minutes: 1)),
        errorCode: 'NETWORK_TIMEOUT',
      );
      final failed = _queueItem(
        localId: 'queue-failed',
        state: SyncQueueState.failed,
        updatedAt: now.subtract(const Duration(minutes: 5)),
        attemptCount: 5,
        errorCode: 'SYNC_PUSH_FAILED',
      );
      final staleInProgress = _queueItem(
        localId: 'queue-stale',
        state: SyncQueueState.inProgress,
        updatedAt: now.subtract(const Duration(minutes: 30)),
        lastAttemptAt: now.subtract(const Duration(minutes: 30)),
      );
      final freshInProgress = _queueItem(
        localId: 'queue-fresh',
        state: SyncQueueState.inProgress,
        updatedAt: now.subtract(const Duration(minutes: 1)),
        lastAttemptAt: now.subtract(const Duration(minutes: 1)),
      );
      final conflicted = _queueItem(
        localId: 'queue-conflict',
        state: SyncQueueState.pending,
        updatedAt: now.subtract(const Duration(minutes: 6)),
        entityType: 'Order',
        entityId: 'order-conflict',
      );

      for (final item in [
        pending,
        retrying,
        failed,
        staleInProgress,
        freshInProgress,
        conflicted,
      ]) {
        await repository.appendQueuedChange(
          queueItem: item,
          changeLogEntry: _changeLogEntry('change-${item.localId}', item),
        );
      }
      await repository.recordSyncConflict(
        SyncConflict(
          id: 'conflict-1',
          tenantId: conflicted.tenantId,
          outletId: conflicted.outletId,
          deviceId: conflicted.deviceId,
          queueItemId: conflicted.localId,
          entityType: conflicted.entityType,
          entityId: conflicted.entityId,
          status: SyncConflictStatus.open,
          detectedAt: now.subtract(const Duration(minutes: 5)),
          localPayload: conflicted.payload,
          serverPayload: const {'serverVersion': true},
        ),
      );
      await repository.insertSyncBatch(
        SyncBatch(
          id: 'batch-1',
          tenantId: 'tenant-1',
          outletId: 'outlet-1',
          deviceId: 'device-1',
          queueItemIds: const ['queue-pending', 'queue-retrying'],
          state: SyncQueueState.retrying,
          createdAt: now.subtract(const Duration(minutes: 3)),
          startedAt: now.subtract(const Duration(minutes: 3)),
          completedAt: now.subtract(const Duration(minutes: 2)),
        ),
      );
      await repository.upsertSyncCheckpoint(
        SyncCheckpoint(
          tenantId: 'tenant-1',
          outletId: 'outlet-1',
          deviceId: 'device-1',
          module: 'orders',
          cursor: 'orders-cursor-9',
          updatedAt: now.subtract(const Duration(minutes: 1)),
        ),
      );

      final snapshot = await service.getHealthSnapshot(
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        deviceId: 'device-1',
        now: now,
        staleInProgressAfter: const Duration(minutes: 10),
      );

      expect(snapshot.pendingCount, 1);
      expect(snapshot.retryingCount, 1);
      expect(snapshot.failedCount, 1);
      expect(snapshot.conflictCount, 1);
      expect(snapshot.inProgressCount, 2);
      expect(snapshot.failedItems.single.localId, 'queue-failed');
      expect(snapshot.retryingItems.single.localId, 'queue-retrying');
      expect(snapshot.staleInProgressItems.single.localId, 'queue-stale');
      expect(snapshot.openConflicts.single.id, 'conflict-1');
      expect(snapshot.recentBatches.single.id, 'batch-1');
      expect(snapshot.checkpoints.single.cursor, 'orders-cursor-9');
      expect(snapshot.requiresAttention, isTrue);

      await database.close();
      await directory.delete(recursive: true);
    },
  );

  test('recovers failed, retrying, and stale in-progress sync items', () async {
    final directory = await Directory.systemTemp.createTemp(
      'restaurant-pos-sync-recovery-',
    );
    final database = OfflineLocalDatabase(
      databaseFactory: databaseFactoryFfi,
      databasePath: '${directory.path}/offline.db',
    );
    final repository = OfflineLocalRepository(database);
    final service = OfflineSyncMonitoringService(repository: repository);
    final now = DateTime.utc(2026, 6, 15, 19);

    await repository.upsertDeviceSyncState(_deviceState(updatedAt: now));
    final failed = _queueItem(
      localId: 'queue-failed',
      state: SyncQueueState.failed,
      updatedAt: now.subtract(const Duration(minutes: 10)),
      attemptCount: 5,
      errorCode: 'SYNC_PUSH_FAILED',
    );
    final retrying = _queueItem(
      localId: 'queue-retrying',
      state: SyncQueueState.retrying,
      updatedAt: now.subtract(const Duration(minutes: 8)),
      attemptCount: 2,
      nextRetryAt: now.add(const Duration(minutes: 3)),
      errorCode: 'NETWORK_TIMEOUT',
    );
    final stale = _queueItem(
      localId: 'queue-stale',
      state: SyncQueueState.inProgress,
      updatedAt: now.subtract(const Duration(minutes: 20)),
    );
    final fresh = _queueItem(
      localId: 'queue-fresh',
      state: SyncQueueState.inProgress,
      updatedAt: now.subtract(const Duration(minutes: 1)),
    );

    for (final item in [failed, retrying, stale, fresh]) {
      await repository.appendQueuedChange(
        queueItem: item,
        changeLogEntry: _changeLogEntry('change-${item.localId}', item),
      );
    }

    final retryResult = await service.retryFailedItems(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localIds: const ['queue-failed', 'queue-retrying', 'missing'],
      now: now,
    );
    final staleResult = await service.recoverStaleInProgressItems(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      now: now,
      staleInProgressAfter: const Duration(minutes: 10),
    );

    final recoveredFailed = await repository.getSyncQueueItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localId: 'queue-failed',
    );
    final recoveredRetrying = await repository.getSyncQueueItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localId: 'queue-retrying',
    );
    final recoveredStale = await repository.getSyncQueueItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localId: 'queue-stale',
    );
    final unchangedFresh = await repository.getSyncQueueItem(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      localId: 'queue-fresh',
    );
    final snapshot = await service.getHealthSnapshot(
      tenantId: 'tenant-1',
      outletId: 'outlet-1',
      deviceId: 'device-1',
      now: now,
    );

    expect(retryResult.recoveredCount, 2);
    expect(staleResult.recoveredCount, 1);
    expect(recoveredFailed?.state, SyncQueueState.pending);
    expect(recoveredFailed?.attemptCount, 0);
    expect(recoveredFailed?.errorCode, isNull);
    expect(recoveredRetrying?.state, SyncQueueState.pending);
    expect(recoveredStale?.state, SyncQueueState.retrying);
    expect(recoveredStale?.errorCode, 'SYNC_RECOVERED_STALE_IN_PROGRESS');
    expect(unchangedFresh?.state, SyncQueueState.inProgress);
    expect(snapshot.pendingCount, 2);
    expect(snapshot.retryingCount, 1);
    expect(snapshot.failedCount, 0);
    expect(snapshot.staleInProgressItems, isEmpty);

    await database.close();
    await directory.delete(recursive: true);
  });
}

DeviceSyncState _deviceState({required DateTime updatedAt}) => DeviceSyncState(
  tenantId: 'tenant-1',
  outletId: 'outlet-1',
  deviceId: 'device-1',
  userId: 'user-1',
  syncEnabled: true,
  isOnline: false,
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  updatedAt: updatedAt,
);

SyncQueueItem _queueItem({
  required String localId,
  required SyncQueueState state,
  required DateTime updatedAt,
  int attemptCount = 0,
  DateTime? lastAttemptAt,
  DateTime? nextRetryAt,
  String? errorCode,
  String? entityType,
  String? entityId,
}) => SyncQueueItem(
  localId: localId,
  tenantId: 'tenant-1',
  outletId: 'outlet-1',
  deviceId: 'device-1',
  actorUserId: 'user-1',
  module: 'orders',
  entityType: entityType ?? 'Order',
  entityId: entityId ?? 'order-1',
  operationType: SyncOperationType.update,
  idempotencyKey: 'idempotency-$localId',
  businessDate: DateTime.utc(2026, 6, 15),
  occurredAt: updatedAt,
  payload: {'localId': localId},
  state: state,
  attemptCount: attemptCount,
  lastAttemptAt: lastAttemptAt,
  nextRetryAt: nextRetryAt,
  errorCode: errorCode,
  createdAt: updatedAt,
  updatedAt: updatedAt,
);

LocalChangeLogEntry _changeLogEntry(String id, SyncQueueItem item) =>
    LocalChangeLogEntry(
      id: id,
      queueItemLocalId: item.localId,
      tenantId: item.tenantId,
      outletId: item.outletId,
      deviceId: item.deviceId,
      actorUserId: item.actorUserId,
      module: item.module,
      entityType: item.entityType,
      entityId: item.entityId,
      operationType: item.operationType,
      businessDate: item.businessDate,
      occurredAt: item.occurredAt,
      payload: item.payload,
      createdAt: item.createdAt,
    );
