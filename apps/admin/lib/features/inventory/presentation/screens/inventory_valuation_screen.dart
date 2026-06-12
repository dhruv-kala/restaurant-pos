import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/inventory_query.dart';
import '../providers/inventory_providers.dart';

class InventoryValuationScreen extends ConsumerWidget {
  const InventoryValuationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = InventoryQuery();
    final valuation = ref.watch(inventoryValuationProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Inventory Valuation')),
      body: valuation.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(error.toString())),
        data: (value) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: ListTile(
                title: const Text('Total Inventory Value'),
                subtitle: Text('${value.totalInventoryValue} minor units'),
                trailing: Text('${value.totalIngredients} ingredients'),
              ),
            ),
            for (final item in value.items)
              ListTile(
                title: Text(item.ingredientName),
                subtitle: Text('${item.quantity} x ${item.unitCost}'),
                trailing: Text('${item.value}'),
              ),
          ],
        ),
      ),
    );
  }
}
