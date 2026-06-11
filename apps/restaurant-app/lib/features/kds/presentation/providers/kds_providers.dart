import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/kds_repository.dart';
import '../../domain/kds_query.dart';

final kdsApiServiceProvider = Provider<KdsApiService>(
  (ref) => KdsApiService(ref.watch(dioProvider)),
);
final kdsRepositoryProvider = Provider<KdsRepository>(
  (ref) => KdsRepository(ref.watch(kdsApiServiceProvider)),
);
final kitchenQueueProvider = FutureProvider.autoDispose
    .family<List<KitchenTicket>, KdsQuery>(
      (ref, query) => ref.watch(kdsRepositoryProvider).queue(query),
    );
final readyOrdersProvider = FutureProvider.autoDispose<List<KitchenTicket>>(
  (ref) => ref.watch(kdsRepositoryProvider).ready(),
);
final activeOrdersProvider = FutureProvider.autoDispose<List<KitchenTicket>>(
  (ref) => ref.watch(kdsRepositoryProvider).active(),
);
final completedOrdersProvider = FutureProvider.autoDispose<List<KitchenTicket>>(
  (ref) => ref.watch(kdsRepositoryProvider).completed(),
);
final kitchenCategoriesProvider =
    FutureProvider.autoDispose<List<KitchenCategory>>(
      (ref) => ref.watch(kdsRepositoryProvider).categories(),
    );
