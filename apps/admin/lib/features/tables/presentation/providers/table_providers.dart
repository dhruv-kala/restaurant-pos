import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/tables_repository.dart';
import '../../domain/table_query.dart';

final activeOutletIdProvider = Provider<String>(
  (ref) => const String.fromEnvironment('OUTLET_ID'),
);

final tablesApiServiceProvider = Provider<TablesApiService>(
  (ref) => TablesApiService(ref.watch(dioProvider)),
);

final tablesRepositoryProvider = Provider<TablesRepository>(
  (ref) => TablesRepository(ref.watch(tablesApiServiceProvider)),
);

final tableSectionsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TableSection>, TableQuery>((ref, query) {
      return ref.watch(tablesRepositoryProvider).sections(query);
    });

final diningTablesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<DiningTable>, TableQuery>((ref, query) {
      return ref.watch(tablesRepositoryProvider).tables(query);
    });
