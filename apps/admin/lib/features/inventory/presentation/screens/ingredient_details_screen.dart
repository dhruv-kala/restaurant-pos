import 'package:flutter/material.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class IngredientDetailsScreen extends StatelessWidget {
  const IngredientDetailsScreen({required this.ingredient, super.key});
  final Ingredient ingredient;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(ingredient.name)),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ListTile(title: const Text('SKU'), subtitle: Text(ingredient.sku)),
        ListTile(
          title: const Text('Category'),
          subtitle: Text(ingredient.category?.name ?? ingredient.categoryId),
        ),
        ListTile(
          title: const Text('Unit'),
          subtitle: Text(ingredient.unit?.code ?? ingredient.unitId),
        ),
        ListTile(
          title: const Text('Cost'),
          subtitle: Text('${ingredient.costPrice} minor units'),
        ),
        ListTile(
          title: const Text('Reorder Level'),
          subtitle: Text('${ingredient.reorderLevel}'),
        ),
        ListTile(
          title: const Text('Minimum Stock'),
          subtitle: Text('${ingredient.minimumStock}'),
        ),
        ListTile(
          title: const Text('Maximum Stock'),
          subtitle: Text('${ingredient.maximumStock ?? 'Not set'}'),
        ),
        ListTile(
          title: const Text('Expiry Tracking'),
          subtitle: Text(ingredient.trackExpiry ? 'Enabled' : 'Disabled'),
        ),
      ],
    ),
  );
}
