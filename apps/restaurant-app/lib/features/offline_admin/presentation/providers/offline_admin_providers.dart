import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/offline/local_database.dart';
import '../../../../core/offline/offline_local_repository.dart';
import '../../../../core/offline/offline_sync_monitoring_service.dart';

typedef OfflineAdminScope = ({
  String tenantId,
  String outletId,
  String deviceId,
});

final offlineLocalDatabaseProvider = Provider<OfflineLocalDatabase>(
  (ref) => OfflineLocalDatabase(),
);

final offlineLocalRepositoryProvider = Provider<OfflineLocalRepository>(
  (ref) => OfflineLocalRepository(ref.watch(offlineLocalDatabaseProvider)),
);

final offlineSyncMonitoringServiceProvider =
    Provider<OfflineSyncMonitoringService>(
      (ref) => OfflineSyncMonitoringService(
        repository: ref.watch(offlineLocalRepositoryProvider),
      ),
    );

final offlineSyncHealthProvider = FutureProvider.autoDispose
    .family<OfflineSyncHealthSnapshot, OfflineAdminScope>(
      (ref, scope) => ref
          .watch(offlineSyncMonitoringServiceProvider)
          .getHealthSnapshot(
            tenantId: scope.tenantId,
            outletId: scope.outletId,
            deviceId: scope.deviceId,
            now: DateTime.now().toUtc(),
          ),
    );
