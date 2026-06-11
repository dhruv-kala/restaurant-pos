import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/orders_repository.dart';
import '../../domain/order_query.dart';

final ordersApiServiceProvider = Provider<OrdersApiService>(
  (ref) => OrdersApiService(ref.watch(dioProvider)),
);
final ordersRepositoryProvider = Provider<OrdersRepository>(
  (ref) => OrdersRepository(ref.watch(ordersApiServiceProvider)),
);
final activeOrdersProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Order>, OrderQuery>(
      (ref, query) => ref.watch(ordersRepositoryProvider).activeOrders(query),
    );
final orderDetailsProvider = FutureProvider.autoDispose.family<Order, String>(
  (ref, id) => ref.watch(ordersRepositoryProvider).order(id),
);
final kitchenQueueProvider = FutureProvider.autoDispose<List<Order>>(
  (ref) => ref.watch(ordersRepositoryProvider).kitchenQueue(),
);
