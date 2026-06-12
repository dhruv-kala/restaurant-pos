import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../../data/inventory_repository.dart';
import '../../domain/inventory_query.dart';

final inventoryApiServiceProvider = Provider<InventoryApiService>(
  (ref) => InventoryApiService(ref.watch(dioProvider)),
);

final inventoryRepositoryProvider = Provider<InventoryRepository>(
  (ref) => InventoryRepository(ref.watch(inventoryApiServiceProvider)),
);

final inventoryCategoriesProvider =
    FutureProvider.autoDispose<List<InventoryCategory>>(
      (ref) => ref.watch(inventoryRepositoryProvider).categories(),
    );

final inventoryUnitsProvider = FutureProvider.autoDispose<List<UnitOfMeasure>>(
  (ref) => ref.watch(inventoryRepositoryProvider).units(),
);

final ingredientProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Ingredient>, InventoryQuery>(
      (ref, query) => ref.watch(inventoryRepositoryProvider).ingredients(query),
    );

final stockProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<InventoryStock>, InventoryQuery>(
      (ref, query) => ref.watch(inventoryRepositoryProvider).stocks(query),
    );

final vendorProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Vendor>, InventoryQuery>(
      (ref, query) => ref.watch(inventoryRepositoryProvider).vendors(query),
    );

final purchaseOrdersProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<PurchaseOrder>, InventoryQuery>(
      (ref, query) =>
          ref.watch(inventoryRepositoryProvider).purchaseOrders(query),
    );

final alertsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<InventoryAlert>, InventoryQuery>(
      (ref, query) => ref.watch(inventoryRepositoryProvider).alerts(query),
    );

final inventoryValuationProvider = FutureProvider.autoDispose
    .family<InventoryValuation, InventoryQuery>(
      (ref, query) => ref.watch(inventoryRepositoryProvider).valuation(query),
    );
