import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/recipe_query.dart';
import '../providers/recipe_providers.dart';
import 'consumption_history_screen.dart';
import 'profitability_screen.dart';
import 'recipe_costing_screen.dart';
import 'recipe_list_screen.dart';
import 'wastage_management_screen.dart';

class RecipeDashboard extends ConsumerWidget {
  const RecipeDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = RecipeQuery();
    final recipes = ref.watch(recipeProvider(query));
    final consumption = ref.watch(consumptionProvider(query));
    final wastage = ref.watch(wastageProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Recipes')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _Metric('Recipes', '${recipes.value?.meta.total ?? 0}'),
              _Metric(
                'Consumption rows',
                '${consumption.value?.meta.total ?? 0}',
              ),
              _Metric('Wastage rows', '${wastage.value?.meta.total ?? 0}'),
            ],
          ),
          const SizedBox(height: 24),
          for (final action in <(String, IconData, Widget)>[
            ('Recipe list', Icons.menu_book, const RecipeListScreen()),
            ('Recipe costing', Icons.calculate, const RecipeCostingScreen()),
            ('Profitability', Icons.insights, const ProfitabilityScreen()),
            (
              'Consumption history',
              Icons.history,
              const ConsumptionHistoryScreen(),
            ),
            (
              'Wastage management',
              Icons.delete_outline,
              const WastageManagementScreen(),
            ),
          ])
            ListTile(
              leading: Icon(action.$2),
              title: Text(action.$1),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(
                context,
              ).push(MaterialPageRoute<void>(builder: (_) => action.$3)),
            ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: SizedBox(
        width: 150,
        child: Column(
          children: [
            Text(value, style: Theme.of(context).textTheme.headlineSmall),
            Text(label),
          ],
        ),
      ),
    ),
  );
}
