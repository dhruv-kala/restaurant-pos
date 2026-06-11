import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/menu_repository.dart';
import '../../domain/menu_query.dart';

final menuApiServiceProvider = Provider<MenuApiService>((ref) {
  return MenuApiService(ref.watch(dioProvider));
});

final menuRepositoryProvider = Provider<MenuRepository>((ref) {
  return MenuRepository(ref.watch(menuApiServiceProvider));
});

final categoryProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<MenuCategory>, MenuQuery>((ref, query) {
      return ref.watch(menuRepositoryProvider).categories(query);
    });

final menuItemsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<MenuItem>, MenuQuery>((ref, query) {
      return ref.watch(menuRepositoryProvider).items(query);
    });
