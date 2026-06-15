import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import 'offline_local_repository.dart';

class OfflineSyncHealthSnapshot {
  const OfflineSyncHealthSnapshot({
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.generatedAt,
    required this.queueCountsByState,
    required this.failedItems,
    required this.retryingItems,
    required this.staleInProgressItems,
    required this.openConflicts,
    required this.recentBatches,
    required this.checkpoints,
    this.deviceSyncState,
  });

  final String tenantId;
  final String outletId;
  final String deviceId;
  final DateTime generatedAt;
  final DeviceSyncState? deviceSyncState;
  final Map<SyncQueueState, int> queueCountsByState;
  final List<SyncQueueItem> failedItems;
  final List<SyncQueueItem> retryingItems;
  final List<SyncQueueItem> staleInProgressItems;
  final List<SyncConflict> openConflicts;
  final List<SyncBatch> recentBatches;
  final List<SyncCheckpoint> checkpoints;

  int get pendingCount => queueCountsByState[SyncQueueState.pending] ?? 0;
  int get retryingCount => queueCountsByState[SyncQueueState.retrying] ?? 0;
  int get failedCount => queueCountsByState[SyncQueueState.failed] ?? 0;
  int get conflictCount => queueCountsByState[SyncQueueState.conflict] ?? 0;
  int get inProgressCount => queueCountsByState[SyncQueueState.inProgress] ?? 0;

  bool get requiresAttention =>
      failedCount > 0 || conflictCount > 0 || staleInProgressItems.isNotEmpty;
}

class OfflineSyncRecoveryResult {
  const OfflineSyncRecoveryResult({
    required this.recoveredCount,
    required this.recoveredAt,
  });

  final int recoveredCount;
  final DateTime recoveredAt;
}

class OfflineSyncMonitoringService {
  const OfflineSyncMonitoringService({required this.repository});

  final OfflineLocalRepository repository;

  Future<OfflineSyncHealthSnapshot> getHealthSnapshot({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required DateTime now,
    Duration staleInProgressAfter = const Duration(minutes: 10),
    int itemLimit = 50,
    int batchLimit = 20,
  }) async {
    final staleBefore = now.toUtc().subtract(staleInProgressAfter);
    final state = await repository.getDeviceSyncState(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
    );
    final counts = await repository.countSyncQueueItemsByState(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
    );
    final failedItems = await repository.listSyncQueueItems(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      state: SyncQueueState.failed,
      limit: itemLimit,
    );
    final retryingItems = await repository.listSyncQueueItems(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      state: SyncQueueState.retrying,
      limit: itemLimit,
    );
    final staleInProgressItems =
        (await repository.listSyncQueueItems(
              tenantId: tenantId,
              outletId: outletId,
              deviceId: deviceId,
              state: SyncQueueState.inProgress,
              limit: itemLimit,
            ))
            .where(
              (item) =>
                  item.updatedAt.toUtc().isBefore(staleBefore) ||
                  item.updatedAt.toUtc().isAtSameMomentAs(staleBefore),
            )
            .toList(growable: false);
    final openConflicts = await repository.listSyncConflicts(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      status: SyncConflictStatus.open,
      limit: itemLimit,
    );
    final batches = await repository.listSyncBatches(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      limit: batchLimit,
    );
    final checkpoints = await repository.listSyncCheckpoints(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
    );

    return OfflineSyncHealthSnapshot(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      generatedAt: now,
      deviceSyncState: state,
      queueCountsByState: counts,
      failedItems: failedItems,
      retryingItems: retryingItems,
      staleInProgressItems: staleInProgressItems,
      openConflicts: openConflicts,
      recentBatches: batches,
      checkpoints: checkpoints,
    );
  }

  Future<OfflineSyncRecoveryResult> retryFailedItems({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required Iterable<String> localIds,
    required DateTime now,
  }) async {
    final recovered = await repository.retrySyncQueueItems(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      localIds: localIds,
      retriedAt: now,
    );
    await repository.updateDeviceSyncStateCounters(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      updatedAt: now,
    );
    return OfflineSyncRecoveryResult(
      recoveredCount: recovered,
      recoveredAt: now,
    );
  }

  Future<OfflineSyncRecoveryResult> recoverStaleInProgressItems({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required DateTime now,
    Duration staleInProgressAfter = const Duration(minutes: 10),
  }) async {
    final recovered = await repository.recoverStaleInProgressQueueItems(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      staleBefore: now.toUtc().subtract(staleInProgressAfter),
      recoveredAt: now,
    );
    await repository.updateDeviceSyncStateCounters(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      updatedAt: now,
    );
    return OfflineSyncRecoveryResult(
      recoveredCount: recovered,
      recoveredAt: now,
    );
  }
}
