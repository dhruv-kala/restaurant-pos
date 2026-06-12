import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../../../inventory/domain/inventory_query.dart';
import '../../../inventory/presentation/providers/inventory_providers.dart';
import '../../domain/recipe_query.dart';
import '../providers/recipe_providers.dart';

class WastageManagementScreen extends ConsumerStatefulWidget {
  const WastageManagementScreen({super.key});

  @override
  ConsumerState<WastageManagementScreen> createState() =>
      _WastageManagementScreenState();
}

class _WastageManagementScreenState
    extends ConsumerState<WastageManagementScreen> {
  final _outlet = TextEditingController();
  final _quantity = TextEditingController(text: '1');
  String? _ingredientId;
  String? _unitId;
  WastageReason _reason = WastageReason.preparation;

  @override
  void dispose() {
    _outlet.dispose();
    _quantity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const query = RecipeQuery();
    final rows = ref.watch(wastageProvider(query));
    final ingredients = ref.watch(
      ingredientProvider(const InventoryQuery(limit: 100)),
    );
    final units = ref.watch(inventoryUnitsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Wastage management')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: 260,
                  child: TextField(
                    controller: _outlet,
                    decoration: const InputDecoration(labelText: 'Outlet ID'),
                  ),
                ),
                SizedBox(
                  width: 220,
                  child: DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Ingredient'),
                    items:
                        ingredients.value?.data
                            .map(
                              (item) => DropdownMenuItem(
                                value: item.id,
                                child: Text(item.name),
                              ),
                            )
                            .toList() ??
                        const [],
                    onChanged: (value) => _ingredientId = value,
                  ),
                ),
                SizedBox(
                  width: 140,
                  child: DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Unit'),
                    items:
                        units.value
                            ?.map(
                              (unit) => DropdownMenuItem(
                                value: unit.id,
                                child: Text(unit.code),
                              ),
                            )
                            .toList() ??
                        const [],
                    onChanged: (value) => _unitId = value,
                  ),
                ),
                SizedBox(
                  width: 100,
                  child: TextField(
                    controller: _quantity,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Quantity'),
                  ),
                ),
                DropdownButton<WastageReason>(
                  value: _reason,
                  items: WastageReason.values
                      .map(
                        (reason) => DropdownMenuItem(
                          value: reason,
                          child: Text(reason.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setState(() => _reason = value ?? _reason),
                ),
                FilledButton(
                  onPressed: _record,
                  child: const Text('Record wastage'),
                ),
              ],
            ),
          ),
          Expanded(
            child: rows.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
              data: (page) => ListView.builder(
                itemCount: page.data.length,
                itemBuilder: (context, index) {
                  final item = page.data[index];
                  return ListTile(
                    title: Text(item.ingredientName ?? item.ingredientId),
                    subtitle: Text('${item.quantity} · ${item.reason.name}'),
                    trailing: Text('${item.costAtWastage}'),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _record() async {
    if (_outlet.text.trim().isEmpty ||
        _ingredientId == null ||
        _unitId == null) {
      return;
    }
    await ref.read(recipesRepositoryProvider).recordWastage({
      'outletId': _outlet.text.trim(),
      'ingredientId': _ingredientId,
      'unitId': _unitId,
      'quantity': double.parse(_quantity.text),
      'reason': _reason.wireName,
    });
    ref.invalidate(wastageProvider(const RecipeQuery()));
  }
}
