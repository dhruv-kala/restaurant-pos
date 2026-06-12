import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/recipe_query.dart';
import '../providers/recipe_providers.dart';

class RecipeCostingScreen extends ConsumerWidget {
  const RecipeCostingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recipes = ref.watch(recipeProvider(const RecipeQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Recipe costing')),
      body: recipes.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (page) => ListView.builder(
          itemCount: page.data.length,
          itemBuilder: (context, index) {
            final recipe = page.data[index];
            final cost = ref.watch(recipeCostProvider(recipe.id));
            return ListTile(
              title: Text(recipe.name),
              subtitle: cost.when(
                loading: () => const Text('Calculating...'),
                error: (error, _) => Text('$error'),
                data: (value) => Text(
                  'Cost: ${value.calculatedCost} minor units · '
                  '${value.ingredientBreakdown.length} ingredients',
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
