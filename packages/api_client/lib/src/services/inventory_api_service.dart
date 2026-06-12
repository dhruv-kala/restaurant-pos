import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../api_endpoints.dart';

class InventoryApiService {
  const InventoryApiService(this._dio);
  final Dio _dio;

  Future<List<InventoryCategory>> getCategories({String? tenantId}) async =>
      _list(
        await _dio.get<Object?>(
          ApiEndpoints.inventoryCategories,
          queryParameters: _scope(tenantId: tenantId),
        ),
        InventoryCategory.fromJson,
      );

  Future<InventoryCategory> createCategory(
    Map<String, dynamic> payload,
  ) async => InventoryCategory.fromJson(
    _map(
      await _dio.post<Object?>(ApiEndpoints.inventoryCategories, data: payload),
    ),
  );

  Future<List<UnitOfMeasure>> getUnits({String? tenantId}) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.inventoryUnits,
      queryParameters: _scope(tenantId: tenantId),
    ),
    UnitOfMeasure.fromJson,
  );

  Future<UnitOfMeasure> createUnit(Map<String, dynamic> payload) async =>
      UnitOfMeasure.fromJson(
        _map(
          await _dio.post<Object?>(ApiEndpoints.inventoryUnits, data: payload),
        ),
      );

  Future<PaginatedResponse<Ingredient>> getIngredients({
    int page = 1,
    int limit = 20,
    String? search,
    String? categoryId,
    String? tenantId,
  }) async => PaginatedResponse<Ingredient>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.ingredients,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (search?.isNotEmpty ?? false) 'search': search,
          if (categoryId != null) 'categoryId': categoryId,
          if (tenantId != null) 'tenantId': tenantId,
        },
      ),
    ),
    Ingredient.fromJson,
  );

  Future<Ingredient> getIngredient(String id) async => Ingredient.fromJson(
    _map(await _dio.get<Object?>(ApiEndpoints.ingredient(id))),
  );

  Future<Ingredient> createIngredient(Map<String, dynamic> payload) async =>
      Ingredient.fromJson(
        _map(await _dio.post<Object?>(ApiEndpoints.ingredients, data: payload)),
      );

  Future<Ingredient> updateIngredient(
    String id,
    Map<String, dynamic> payload,
  ) async => Ingredient.fromJson(
    _map(await _dio.patch<Object?>(ApiEndpoints.ingredient(id), data: payload)),
  );

  Future<void> deleteIngredient(String id) async {
    await _dio.delete<Object?>(ApiEndpoints.ingredient(id));
  }

  Future<PaginatedResponse<InventoryStock>> getStocks({
    int page = 1,
    int limit = 20,
    String? search,
    String? tenantId,
    String? outletId,
  }) async => PaginatedResponse<InventoryStock>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.inventoryStocks,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (search?.isNotEmpty ?? false) 'search': search,
          ..._scope(tenantId: tenantId, outletId: outletId),
        },
      ),
    ),
    InventoryStock.fromJson,
  );

  Future<StockTransaction> adjustStock(Map<String, dynamic> payload) async =>
      StockTransaction.fromJson(
        _map(
          await _dio.post<Object?>(
            ApiEndpoints.inventoryStockAdjust,
            data: payload,
          ),
        ),
      );

  Future<Map<String, dynamic>> transferStock(
    Map<String, dynamic> payload,
  ) async => _map(
    await _dio.post<Object?>(
      ApiEndpoints.inventoryStockTransfer,
      data: payload,
    ),
  );

  Future<PaginatedResponse<Vendor>> getVendors({
    int page = 1,
    int limit = 20,
    String? search,
    String? tenantId,
  }) async => PaginatedResponse<Vendor>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.vendors,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (search?.isNotEmpty ?? false) 'search': search,
          if (tenantId != null) 'tenantId': tenantId,
        },
      ),
    ),
    Vendor.fromJson,
  );

  Future<Vendor> createVendor(Map<String, dynamic> payload) async =>
      Vendor.fromJson(
        _map(await _dio.post<Object?>(ApiEndpoints.vendors, data: payload)),
      );

  Future<Vendor> updateVendor(String id, Map<String, dynamic> payload) async =>
      Vendor.fromJson(
        _map(await _dio.patch<Object?>(ApiEndpoints.vendor(id), data: payload)),
      );

  Future<PaginatedResponse<PurchaseOrder>> getPurchaseOrders({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    String? status,
  }) async => PaginatedResponse<PurchaseOrder>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.purchaseOrders,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (status != null) 'status': status,
          ..._scope(tenantId: tenantId, outletId: outletId),
        },
      ),
    ),
    PurchaseOrder.fromJson,
  );

  Future<PurchaseOrder> createPurchaseOrder(
    Map<String, dynamic> payload,
  ) async => PurchaseOrder.fromJson(
    _map(await _dio.post<Object?>(ApiEndpoints.purchaseOrders, data: payload)),
  );

  Future<PurchaseOrder> updatePurchaseOrder(
    String id,
    Map<String, dynamic> payload,
  ) async => PurchaseOrder.fromJson(
    _map(
      await _dio.patch<Object?>(ApiEndpoints.purchaseOrder(id), data: payload),
    ),
  );

  Future<PurchaseOrder> receivePurchaseOrder(String id) async =>
      PurchaseOrder.fromJson(
        _map(await _dio.post<Object?>(ApiEndpoints.receivePurchaseOrder(id))),
      );

  Future<PaginatedResponse<InventoryAlert>> getAlerts({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    String? alertType,
    bool? isResolved,
  }) async => PaginatedResponse<InventoryAlert>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.inventoryAlerts,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (alertType != null) 'alertType': alertType,
          if (isResolved != null) 'isResolved': isResolved,
          ..._scope(tenantId: tenantId, outletId: outletId),
        },
      ),
    ),
    InventoryAlert.fromJson,
  );

  Future<InventoryAlert> resolveAlert(String id) async =>
      InventoryAlert.fromJson(
        _map(await _dio.patch<Object?>(ApiEndpoints.resolveInventoryAlert(id))),
      );

  Future<InventoryValuation> getInventoryValuation({
    String? tenantId,
    String? outletId,
  }) async => InventoryValuation.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.inventoryValuation,
        queryParameters: _scope(tenantId: tenantId, outletId: outletId),
      ),
    ),
  );
}

Map<String, dynamic> _scope({String? tenantId, String? outletId}) => {
  if (tenantId != null) 'tenantId': tenantId,
  if (outletId != null) 'outletId': outletId,
};

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map)
    return Map<String, dynamic>.from(response.data! as Map);
  throw const FormatException('Expected an object response.');
}

List<T> _list<T>(
  Response<Object?> response,
  T Function(Map<String, dynamic>) parser,
) {
  final data = response.data;
  if (data is! List) throw const FormatException('Expected a list response.');
  return data
      .map((item) => parser(Map<String, dynamic>.from(item as Map)))
      .toList(growable: false);
}
