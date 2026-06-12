import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../../domain/inventory_query.dart';
import '../providers/inventory_providers.dart';
import 'ingredient_details_screen.dart';

class IngredientListScreen extends ConsumerStatefulWidget {
  const IngredientListScreen({super.key});
  @override
  ConsumerState<IngredientListScreen> createState() =>
      _IngredientListScreenState();
}

class _IngredientListScreenState extends ConsumerState<IngredientListScreen> {
  String search = '';
  @override
  Widget build(BuildContext context) {
    final query = InventoryQuery(search: search);
    final ingredients = ref.watch(ingredientProvider(query));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ingredients'),
        actions: [
          IconButton(
            tooltip: 'Create category',
            onPressed: () => _createCategory(context),
            icon: const Icon(Icons.category),
          ),
          IconButton(
            tooltip: 'Create unit',
            onPressed: () => _createUnit(context),
            icon: const Icon(Icons.straighten),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                labelText: 'Search ingredients',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (value) => setState(() => search = value),
            ),
          ),
          Expanded(
            child: ingredients.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text(error.toString())),
              data: (page) => ListView.builder(
                itemCount: page.data.length,
                itemBuilder: (context, index) {
                  final item = page.data[index];
                  return ListTile(
                    title: Text(item.name),
                    subtitle: Text(
                      '${item.sku} | ${item.unit?.code ?? ''} | reorder ${item.reorderLevel}',
                    ),
                    trailing: Text('${item.costPrice}'),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            IngredientDetailsScreen(ingredient: item),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _create(context, query),
        icon: const Icon(Icons.add),
        label: const Text('Ingredient'),
      ),
    );
  }

  Future<void> _create(BuildContext context, InventoryQuery query) async {
    final categories = await ref.read(inventoryCategoriesProvider.future);
    final units = await ref.read(inventoryUnitsProvider.future);
    if (!context.mounted || categories.isEmpty || units.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Create an inventory category and unit first.'),
          ),
        );
      }
      return;
    }
    final name = TextEditingController();
    final sku = TextEditingController();
    final cost = TextEditingController(text: '0');
    final reorder = TextEditingController(text: '0');
    InventoryCategory category = categories.first;
    UnitOfMeasure unit = units.first;
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create Ingredient'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                TextField(
                  controller: sku,
                  decoration: const InputDecoration(labelText: 'SKU'),
                ),
                TextField(
                  controller: cost,
                  decoration: const InputDecoration(
                    labelText: 'Cost minor units',
                  ),
                ),
                TextField(
                  controller: reorder,
                  decoration: const InputDecoration(labelText: 'Reorder level'),
                ),
                DropdownButtonFormField<InventoryCategory>(
                  initialValue: category,
                  items: categories
                      .map(
                        (item) => DropdownMenuItem(
                          value: item,
                          child: Text(item.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setDialogState(() => category = value ?? category),
                  decoration: const InputDecoration(labelText: 'Category'),
                ),
                DropdownButtonFormField<UnitOfMeasure>(
                  initialValue: unit,
                  items: units
                      .map(
                        (item) => DropdownMenuItem(
                          value: item,
                          child: Text(item.code),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setDialogState(() => unit = value ?? unit),
                  decoration: const InputDecoration(labelText: 'Unit'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
    if (accepted != true ||
        name.text.trim().isEmpty ||
        sku.text.trim().isEmpty) {
      return;
    }
    await ref.read(inventoryRepositoryProvider).createIngredient({
      'categoryId': category.id,
      'unitId': unit.id,
      'name': name.text.trim(),
      'sku': sku.text.trim(),
      'costPrice': int.tryParse(cost.text) ?? 0,
      'reorderLevel': double.tryParse(reorder.text) ?? 0,
      'minimumStock': 0,
    });
    ref.invalidate(ingredientProvider(query));
  }

  Future<void> _createCategory(BuildContext context) async {
    final name = TextEditingController();
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Inventory Category'),
        content: TextField(
          controller: name,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    if (accepted != true || name.text.trim().isEmpty) return;
    await ref.read(inventoryRepositoryProvider).createCategory({
      'name': name.text.trim(),
    });
    ref.invalidate(inventoryCategoriesProvider);
  }

  Future<void> _createUnit(BuildContext context) async {
    final name = TextEditingController();
    final code = TextEditingController();
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Unit'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            TextField(
              controller: code,
              decoration: const InputDecoration(labelText: 'Code'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    if (accepted != true ||
        name.text.trim().isEmpty ||
        code.text.trim().isEmpty) {
      return;
    }
    await ref.read(inventoryRepositoryProvider).createUnit({
      'name': name.text.trim(),
      'code': code.text.trim().toUpperCase(),
      'baseUnit': true,
      'conversionFactor': 1,
    });
    ref.invalidate(inventoryUnitsProvider);
  }
}
