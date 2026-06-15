import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import 'offline_local_repository.dart';

abstract class OfflineSyncTransport {
  Future<OfflineSyncPushResult> push(SyncPushRequest request);

  Future<OfflineSyncPullResult> pull(SyncPullRequest request);
}

class OfflineSyncPushResult {
  const OfflineSyncPushResult({required this.items});

  final List<OfflineSyncPushItemResult> items;
}

class OfflineSyncPushItemResult {
  const OfflineSyncPushItemResult({
    required this.localId,
    required this.status,
    this.conflict,
    this.errorCode,
    this.errorMessage,
  });

  final String localId;
  final OfflineSyncPushItemStatus status;
  final SyncConflict? conflict;
  final String? errorCode;
  final String? errorMessage;
}

enum OfflineSyncPushItemStatus { accepted, retry, conflict }

class OfflineSyncPullResult {
  const OfflineSyncPullResult({required this.module, required this.nextCursor});

  final String module;
  final String nextCursor;
}

class OfflineSyncRetryPolicy {
  const OfflineSyncRetryPolicy({
    this.maxAttempts = 5,
    this.baseDelay = const Duration(seconds: 5),
    this.maxDelay = const Duration(minutes: 5),
  });

  final int maxAttempts;
  final Duration baseDelay;
  final Duration maxDelay;

  DateTime nextRetryAt(DateTime now, int attemptCount) {
    var multiplier = 1;
    for (var index = 1; index < attemptCount; index += 1) {
      multiplier *= 2;
    }
    final delay = baseDelay * multiplier;
    return now.add(delay > maxDelay ? maxDelay : delay);
  }
}

class OfflineSyncRunResult {
  const OfflineSyncRunResult({
    required this.claimedCount,
    required this.acceptedCount,
    required this.retryCount,
    required this.failedCount,
    required this.conflictCount,
    required this.pulledModules,
  });

  final int claimedCount;
  final int acceptedCount;
  final int retryCount;
  final int failedCount;
  final int conflictCount;
  final List<String> pulledModules;
}

class OfflineBackgroundSyncService {
  factory OfflineBackgroundSyncService({
    required OfflineLocalRepository repository,
    required OfflineSyncTransport transport,
    OfflineSyncRetryPolicy retryPolicy = const OfflineSyncRetryPolicy(),
    String Function()? idFactory,
  }) => OfflineBackgroundSyncService._(
    repository,
    transport,
    retryPolicy,
    idFactory ?? _defaultIdFactory,
  );

  OfflineBackgroundSyncService._(
    this._repository,
    this._transport,
    this._retryPolicy,
    this._idFactory,
  );

  final OfflineLocalRepository _repository;
  final OfflineSyncTransport _transport;
  final OfflineSyncRetryPolicy _retryPolicy;
  final String Function() _idFactory;

  Future<OfflineSyncRunResult> runOnce({
    required String tenantId,
    required String outletId,
    required String deviceId,
    required DateTime now,
    int batchSize = 25,
    List<String> pullModules = const [],
  }) async {
    final claimed = await _repository.claimRetryableSyncQueueItems(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      now: now,
      limit: batchSize,
      maxAttempts: _retryPolicy.maxAttempts,
    );

    var acceptedCount = 0;
    var retryCount = 0;
    var failedCount = 0;
    var conflictCount = 0;

    if (claimed.isNotEmpty) {
      final batchId = _idFactory();
      await _repository.insertSyncBatch(
        SyncBatch(
          id: batchId,
          tenantId: tenantId,
          outletId: outletId,
          deviceId: deviceId,
          queueItemIds: claimed.map((item) => item.localId).toList(),
          state: SyncQueueState.inProgress,
          createdAt: now,
          startedAt: now,
        ),
      );

      try {
        final pushResult = await _transport.push(
          SyncPushRequest(
            tenantId: tenantId,
            outletId: outletId,
            deviceId: deviceId,
            items: claimed,
          ),
        );
        final resultById = {
          for (final result in pushResult.items) result.localId: result,
        };

        for (final item in claimed) {
          final result = resultById[item.localId];
          if (result == null) {
            retryCount += await _retryOrFail(
              item: item,
              now: now,
              errorCode: 'SYNC_RESULT_MISSING',
              errorMessage: 'No push result was returned for queue item.',
            );
            failedCount += item.attemptCount >= _retryPolicy.maxAttempts
                ? 1
                : 0;
            continue;
          }

          switch (result.status) {
            case OfflineSyncPushItemStatus.accepted:
              await _repository.markSyncQueueItemSuccess(
                item: item,
                completedAt: now,
              );
              acceptedCount += 1;
            case OfflineSyncPushItemStatus.retry:
              final retried = await _retryOrFail(
                item: item,
                now: now,
                errorCode: result.errorCode,
                errorMessage: result.errorMessage,
              );
              if (retried == 1) {
                retryCount += 1;
              } else {
                failedCount += 1;
              }
            case OfflineSyncPushItemStatus.conflict:
              final conflict = result.conflict;
              if (conflict == null) {
                failedCount += 1;
                await _repository.markSyncQueueItemFailed(
                  item: item,
                  failedAt: now,
                  errorCode: 'SYNC_CONFLICT_MISSING',
                  errorMessage: 'Conflict result did not include a conflict.',
                );
              } else {
                await _repository.recordSyncConflict(conflict);
                conflictCount += 1;
              }
          }
        }

        final batchState = conflictCount > 0
            ? SyncQueueState.conflict
            : failedCount > 0
            ? SyncQueueState.failed
            : retryCount > 0
            ? SyncQueueState.retrying
            : SyncQueueState.success;
        await _repository.completeSyncBatch(
          tenantId: tenantId,
          outletId: outletId,
          deviceId: deviceId,
          batchId: batchId,
          state: batchState,
          completedAt: now,
        );
      } catch (error) {
        for (final item in claimed) {
          final retried = await _retryOrFail(
            item: item,
            now: now,
            errorCode: 'SYNC_PUSH_FAILED',
            errorMessage: error.toString(),
          );
          if (retried == 1) {
            retryCount += 1;
          } else {
            failedCount += 1;
          }
        }
        await _repository.completeSyncBatch(
          tenantId: tenantId,
          outletId: outletId,
          deviceId: deviceId,
          batchId: batchId,
          state: SyncQueueState.retrying,
          completedAt: now,
        );
      }
    }

    final pulledModules = <String>[];
    String? lastPullCursor;
    for (final module in pullModules) {
      final checkpoint = await _repository.getSyncCheckpoint(
        tenantId: tenantId,
        outletId: outletId,
        deviceId: deviceId,
        module: module,
      );
      final result = await _transport.pull(
        SyncPullRequest(
          tenantId: tenantId,
          outletId: outletId,
          deviceId: deviceId,
          cursor: checkpoint?.cursor,
        ),
      );
      await _repository.upsertSyncCheckpoint(
        SyncCheckpoint(
          tenantId: tenantId,
          outletId: outletId,
          deviceId: deviceId,
          module: result.module,
          cursor: result.nextCursor,
          updatedAt: now,
        ),
      );
      pulledModules.add(result.module);
      lastPullCursor = result.nextCursor;
    }

    await _repository.updateDeviceSyncStateCounters(
      tenantId: tenantId,
      outletId: outletId,
      deviceId: deviceId,
      updatedAt: now,
      lastPushedAt: claimed.isEmpty ? null : now,
      lastPulledAt: pulledModules.isEmpty ? null : now,
      lastPullCursor: lastPullCursor,
      isOnline: true,
    );

    return OfflineSyncRunResult(
      claimedCount: claimed.length,
      acceptedCount: acceptedCount,
      retryCount: retryCount,
      failedCount: failedCount,
      conflictCount: conflictCount,
      pulledModules: pulledModules,
    );
  }

  Future<int> _retryOrFail({
    required SyncQueueItem item,
    required DateTime now,
    String? errorCode,
    String? errorMessage,
  }) async {
    if (item.attemptCount >= _retryPolicy.maxAttempts) {
      await _repository.markSyncQueueItemFailed(
        item: item,
        failedAt: now,
        errorCode: errorCode,
        errorMessage: errorMessage,
      );
      return 0;
    }

    await _repository.markSyncQueueItemRetrying(
      item: item,
      updatedAt: now,
      nextRetryAt: _retryPolicy.nextRetryAt(now, item.attemptCount),
      errorCode: errorCode,
      errorMessage: errorMessage,
    );
    return 1;
  }
}

String _defaultIdFactory() =>
    'sync-batch-${DateTime.now().toUtc().microsecondsSinceEpoch}';
