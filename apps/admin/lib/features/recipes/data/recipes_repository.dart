import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../domain/recipe_query.dart';

class RecipesRepository {
  const RecipesRepository(this._api);
  final RecipesApiService _api;

  Future<PaginatedResponse<Recipe>> recipes(RecipeQuery query) =>
      _api.getRecipes(
        page: query.page,
        limit: query.limit,
        search: query.search,
        tenantId: query.tenantId,
        menuItemId: query.menuItemId,
      );

  Future<Recipe> recipe(String id) => _api.getRecipe(id);
  Future<Recipe> create(Map<String, dynamic> payload) =>
      _api.createRecipe(payload);
  Future<Recipe> update(String id, Map<String, dynamic> payload) =>
      _api.updateRecipe(id, payload);
  Future<void> delete(String id) => _api.deleteRecipe(id);
  Future<RecipeCost> cost(String id) => _api.getRecipeCost(id);
  Future<List<RecipeProfitability>> profitability(RecipeQuery query) =>
      _api.getProfitability(tenantId: query.tenantId, outletId: query.outletId);
  Future<PaginatedResponse<InventoryConsumption>> consumption(
    RecipeQuery query,
  ) => _api.getConsumption(
    page: query.page,
    limit: query.limit,
    tenantId: query.tenantId,
    outletId: query.outletId,
  );
  Future<PaginatedResponse<InventoryWastage>> wastage(RecipeQuery query) =>
      _api.getWastage(
        page: query.page,
        limit: query.limit,
        tenantId: query.tenantId,
        outletId: query.outletId,
      );
  Future<InventoryWastage> recordWastage(Map<String, dynamic> payload) =>
      _api.recordWastage(payload);
}
