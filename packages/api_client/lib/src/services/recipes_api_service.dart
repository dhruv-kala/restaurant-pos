import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../api_endpoints.dart';

class RecipesApiService {
  const RecipesApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<Recipe>> getRecipes({
    int page = 1,
    int limit = 50,
    String? search,
    String? tenantId,
    String? menuItemId,
  }) async => PaginatedResponse<Recipe>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.recipes,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (search?.isNotEmpty ?? false) 'search': search,
          if (tenantId != null) 'tenantId': tenantId,
          if (menuItemId != null) 'menuItemId': menuItemId,
        },
      ),
    ),
    Recipe.fromJson,
  );

  Future<Recipe> getRecipe(String id) async =>
      Recipe.fromJson(_map(await _dio.get<Object?>(ApiEndpoints.recipe(id))));

  Future<Recipe> createRecipe(Map<String, dynamic> payload) async =>
      Recipe.fromJson(
        _map(await _dio.post<Object?>(ApiEndpoints.recipes, data: payload)),
      );

  Future<Recipe> updateRecipe(String id, Map<String, dynamic> payload) async =>
      Recipe.fromJson(
        _map(await _dio.patch<Object?>(ApiEndpoints.recipe(id), data: payload)),
      );

  Future<void> deleteRecipe(String id) async {
    await _dio.delete<Object?>(ApiEndpoints.recipe(id));
  }

  Future<List<RecipeIngredient>> getRecipeIngredients(String id) async => _list(
    await _dio.get<Object?>(ApiEndpoints.recipeIngredients(id)),
    RecipeIngredient.fromJson,
  );

  Future<RecipeIngredient> addRecipeIngredient(
    String id,
    Map<String, dynamic> payload,
  ) async => RecipeIngredient.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.recipeIngredients(id),
        data: payload,
      ),
    ),
  );

  Future<RecipeCost> getRecipeCost(String id) async => RecipeCost.fromJson(
    _map(await _dio.get<Object?>(ApiEndpoints.recipeCost(id))),
  );

  Future<RecipeCost> calculateRecipeCost(String id) => getRecipeCost(id);

  Future<List<RecipeProfitability>> getProfitability({
    String? tenantId,
    String? outletId,
  }) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.recipeProfitability,
      queryParameters: {
        if (tenantId != null) 'tenantId': tenantId,
        if (outletId != null) 'outletId': outletId,
      },
    ),
    RecipeProfitability.fromJson,
  );

  Future<PaginatedResponse<InventoryConsumption>> getConsumptionHistory({
    int page = 1,
    int limit = 50,
    String? tenantId,
    String? outletId,
  }) => getConsumption(
    page: page,
    limit: limit,
    tenantId: tenantId,
    outletId: outletId,
  );

  Future<PaginatedResponse<InventoryConsumption>> getConsumption({
    int page = 1,
    int limit = 50,
    String? tenantId,
    String? outletId,
  }) async => PaginatedResponse<InventoryConsumption>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.consumption,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (tenantId != null) 'tenantId': tenantId,
          if (outletId != null) 'outletId': outletId,
        },
      ),
    ),
    InventoryConsumption.fromJson,
  );

  Future<InventoryWastage> recordWastage(Map<String, dynamic> payload) async =>
      InventoryWastage.fromJson(
        _map(
          await _dio.post<Object?>(
            ApiEndpoints.inventoryWastage,
            data: payload,
          ),
        ),
      );

  Future<PaginatedResponse<InventoryWastage>> getWastage({
    int page = 1,
    int limit = 50,
    String? tenantId,
    String? outletId,
  }) async => PaginatedResponse<InventoryWastage>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.inventoryWastage,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (tenantId != null) 'tenantId': tenantId,
          if (outletId != null) 'outletId': outletId,
        },
      ),
    ),
    InventoryWastage.fromJson,
  );

  Future<List<ProductionRecipe>> getProductionRecipes({
    String? tenantId,
    String? search,
  }) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.productionRecipes,
      queryParameters: {
        if (tenantId != null) 'tenantId': tenantId,
        if (search?.isNotEmpty ?? false) 'search': search,
      },
    ),
    ProductionRecipe.fromJson,
  );
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}

List<T> _list<T>(
  Response<Object?> response,
  T Function(Map<String, dynamic>) parser,
) {
  if (response.data is! List) {
    throw const FormatException('Expected a list response.');
  }
  return (response.data! as List)
      .map((item) => parser(Map<String, dynamic>.from(item as Map)))
      .toList(growable: false);
}
