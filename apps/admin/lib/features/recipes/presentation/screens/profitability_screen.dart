import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/recipe_query.dart';
import '../providers/recipe_providers.dart';

class ProfitabilityScreen extends ConsumerWidget {
  const ProfitabilityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rows = ref.watch(profitabilityProvider(const RecipeQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Recipe profitability')),
      body: rows.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (items) => ListView.builder(
          itemCount: items.length,
          itemBuilder: (context, index) {
            final item = items[index];
            return ListTile(
              title: Text(item.name),
              subtitle: Text(
                'Price ${item.sellingPrice} · Cost ${item.recipeCost} · '
                'Food cost ${item.foodCostPercentage.toStringAsFixed(1)}%',
              ),
              trailing: Text(
                '${item.grossMarginPercentage.toStringAsFixed(1)}%',
              ),
            );
          },
        ),
      ),
    );
  }
}
