import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/recipe_query.dart';
import '../providers/recipe_providers.dart';
import 'recipe_builder_screen.dart';

class RecipeListScreen extends ConsumerWidget {
  const RecipeListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = RecipeQuery();
    final recipes = ref.watch(recipeProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Recipe list')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context)
            .push(
              MaterialPageRoute<void>(
                builder: (_) => const RecipeBuilderScreen(),
              ),
            )
            .then((_) => ref.invalidate(recipeProvider(query))),
        icon: const Icon(Icons.add),
        label: const Text('Recipe'),
      ),
      body: recipes.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (page) => ListView.separated(
          itemCount: page.data.length,
          separatorBuilder: (_, _) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final recipe = page.data[index];
            return ListTile(
              title: Text(recipe.name),
              subtitle: Text(
                '${recipe.menuItemName ?? recipe.menuItemId} · '
                '${recipe.ingredients.length} ingredients',
              ),
              trailing: const Icon(Icons.edit),
              onTap: () => Navigator.of(context)
                  .push(
                    MaterialPageRoute<void>(
                      builder: (_) => RecipeBuilderScreen(recipeId: recipe.id),
                    ),
                  )
                  .then((_) => ref.invalidate(recipeProvider(query))),
            );
          },
        ),
      ),
    );
  }
}
