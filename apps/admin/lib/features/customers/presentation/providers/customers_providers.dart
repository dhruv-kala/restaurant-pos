import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../../data/customers_repository.dart';
import '../../domain/customer_query.dart';

final customersApiProvider = Provider<CustomersApiService>(
  (ref) => CustomersApiService(ref.watch(dioProvider)),
);
final customersRepositoryProvider = Provider<CustomersRepository>(
  (ref) => CustomersRepository(ref.watch(customersApiProvider)),
);
final customerListProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Customer>, CustomerQuery>(
      (ref, query) => ref.watch(customersRepositoryProvider).list(query),
    );
final customerDetailsProvider = FutureProvider.autoDispose
    .family<Customer, String>(
      (ref, id) => ref.watch(customersRepositoryProvider).get(id),
    );
final customerSearchProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Customer>, String>(
      (ref, query) => ref.watch(customersRepositoryProvider).search(query),
    );
final customerStatsProvider = FutureProvider.autoDispose
    .family<CustomerStats, String>(
      (ref, id) => ref.watch(customersRepositoryProvider).stats(id),
    );
final customerDashboardProvider =
    FutureProvider.autoDispose<CustomerDashboardStats>(
      (ref) => ref.watch(customersRepositoryProvider).dashboard(),
    );
final customerListProviderAlias = customerListProvider;
final customerDetailsProviderAlias = customerDetailsProvider;
