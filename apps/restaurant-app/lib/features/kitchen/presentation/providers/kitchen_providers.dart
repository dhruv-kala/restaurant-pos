import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/kitchen_repository.dart';
import '../../domain/kitchen_query.dart';

final kitchenApiServiceProvider = Provider<KitchenApiService>(
  (ref) => KitchenApiService(ref.watch(dioProvider)),
);
final kitchenRepositoryProvider = Provider<KitchenRepository>(
  (ref) => KitchenRepository(ref.watch(kitchenApiServiceProvider)),
);
final kitchenSocketProvider = Provider<SocketService>((ref) {
  final config = ref.watch(apiClientConfigProvider);
  final uri = Uri.parse(config.baseUrl);
  final socket = SocketService(
    serverUrl: '${uri.scheme}://${uri.authority}',
    accessTokenProvider: ref.watch(tokenStorageProvider).getAccessToken,
  );
  unawaited(socket.connect());
  socket.subscribeKitchenQueue();
  socket.subscribeOrderUpdates();
  ref.onDispose(() => unawaited(socket.dispose()));
  return socket;
});
final kitchenQueueEventsProvider =
    StreamProvider.autoDispose<Map<String, dynamic>>(
      (ref) => ref.watch(kitchenSocketProvider).kitchenQueueUpdates,
    );
final kitchenOrderEventsProvider =
    StreamProvider.autoDispose<Map<String, dynamic>>(
      (ref) => ref.watch(kitchenSocketProvider).orderUpdates,
    );
final stationProvider = FutureProvider.autoDispose<List<KitchenStation>>(
  (ref) => ref.watch(kitchenRepositoryProvider).stations(),
);
final kitchenQueueProvider = FutureProvider.autoDispose
    .family<List<KitchenQueueOrder>, KitchenQuery>((ref, query) {
      ref.watch(kitchenQueueEventsProvider);
      ref.watch(kitchenOrderEventsProvider);
      return ref.watch(kitchenRepositoryProvider).queue(query);
    });
final kitchenMetricsProvider = FutureProvider.autoDispose
    .family<KitchenMetrics, String?>(
      (ref, stationId) =>
          ref.watch(kitchenRepositoryProvider).metrics(stationId),
    );
