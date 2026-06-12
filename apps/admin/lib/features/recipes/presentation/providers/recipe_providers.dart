import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../../data/recipes_repository.dart';
import '../../domain/recipe_query.dart';

final recipesApiServiceProvider = Provider<RecipesApiService>(
  (ref) => RecipesApiService(ref.watch(dioProvider)),
);

final recipesRepositoryProvider = Provider<RecipesRepository>(
  (ref) => RecipesRepository(ref.watch(recipesApiServiceProvider)),
);

final recipeProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Recipe>, RecipeQuery>(
      (ref, query) => ref.watch(recipesRepositoryProvider).recipes(query),
    );

final recipeDetailProvider = FutureProvider.autoDispose.family<Recipe, String>(
  (ref, id) => ref.watch(recipesRepositoryProvider).recipe(id),
);

final recipeCostProvider = FutureProvider.autoDispose
    .family<RecipeCost, String>(
      (ref, id) => ref.watch(recipesRepositoryProvider).cost(id),
    );

final profitabilityProvider = FutureProvider.autoDispose
    .family<List<RecipeProfitability>, RecipeQuery>(
      (ref, query) => ref.watch(recipesRepositoryProvider).profitability(query),
    );

final consumptionProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<InventoryConsumption>, RecipeQuery>(
      (ref, query) => ref.watch(recipesRepositoryProvider).consumption(query),
    );

final wastageProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<InventoryWastage>, RecipeQuery>(
      (ref, query) => ref.watch(recipesRepositoryProvider).wastage(query),
    );
