import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/recipe_query.dart';
import '../providers/recipe_providers.dart';

class ConsumptionHistoryScreen extends ConsumerWidget {
  const ConsumptionHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rows = ref.watch(consumptionProvider(const RecipeQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Consumption history')),
      body: rows.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (page) => ListView.builder(
          itemCount: page.data.length,
          itemBuilder: (context, index) {
            final item = page.data[index];
            return ListTile(
              title: Text(item.ingredientName ?? item.ingredientId),
              subtitle: Text(
                'Order ${item.orderNumber ?? item.orderId} · '
                '${item.consumedQuantity} · ${item.trigger.name}',
              ),
              trailing: Text('${item.costAtConsumption}'),
            );
          },
        ),
      ),
    );
  }
}
