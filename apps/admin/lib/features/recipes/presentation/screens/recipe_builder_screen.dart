import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../inventory/domain/inventory_query.dart';
import '../../../inventory/presentation/providers/inventory_providers.dart';
import '../../../menu/domain/menu_query.dart';
import '../../../menu/presentation/providers/menu_providers.dart';
import '../providers/recipe_providers.dart';

class RecipeBuilderScreen extends ConsumerStatefulWidget {
  const RecipeBuilderScreen({super.key, this.recipeId});
  final String? recipeId;

  @override
  ConsumerState<RecipeBuilderScreen> createState() =>
      _RecipeBuilderScreenState();
}

class _RecipeBuilderScreenState extends ConsumerState<RecipeBuilderScreen> {
  final _name = TextEditingController();
  final _yield = TextEditingController(text: '1');
  final _portion = TextEditingController(text: '1');
  String? _menuItemId;
  String? _variantId;
  String? _yieldUnitId;
  String? _loadedId;
  final List<_IngredientLine> _lines = [_IngredientLine()];
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _yield.dispose();
    _portion.dispose();
    for (final line in _lines) {
      line.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final menu = ref.watch(menuItemsProvider(const MenuQuery(limit: 100)));
    final ingredients = ref.watch(
      ingredientProvider(const InventoryQuery(limit: 100)),
    );
    final units = ref.watch(inventoryUnitsProvider);
    if (widget.recipeId case final id?) {
      ref.watch(recipeDetailProvider(id)).whenData((recipe) {
        if (_loadedId == id) return;
        _loadedId = id;
        _name.text = recipe.name;
        _yield.text = '${recipe.yieldQuantity}';
        _portion.text = '${recipe.portionMultiplier}';
        _menuItemId = recipe.menuItemId;
        _variantId = recipe.variantId;
        _yieldUnitId = recipe.yieldUnitId;
        for (final line in _lines) {
          line.dispose();
        }
        _lines
          ..clear()
          ..addAll(
            recipe.ingredients.map(
              (item) => _IngredientLine(
                ingredientId: item.ingredientId,
                unitId: item.unitId,
                quantity: item.quantity,
                wastage: item.wastagePercentage,
              ),
            ),
          );
        if (_lines.isEmpty) _lines.add(_IngredientLine());
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) setState(() {});
        });
      });
    }
    final selectedMenu = menu.value?.data
        .where((item) => item.id == _menuItemId)
        .firstOrNull;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.recipeId == null ? 'Create recipe' : 'Edit recipe'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: const Text('Save'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Recipe name'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _menuItemId,
            decoration: const InputDecoration(labelText: 'Menu item'),
            items:
                menu.value?.data
                    .map(
                      (item) => DropdownMenuItem(
                        value: item.id,
                        child: Text(item.name),
                      ),
                    )
                    .toList() ??
                const [],
            onChanged: (value) => setState(() {
              _menuItemId = value;
              _variantId = null;
            }),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String?>(
            initialValue: _variantId,
            decoration: const InputDecoration(labelText: 'Variant (optional)'),
            items: [
              const DropdownMenuItem<String?>(child: Text('Base menu item')),
              ...?selectedMenu?.variants.map(
                (variant) => DropdownMenuItem<String?>(
                  value: variant.id,
                  child: Text(variant.name),
                ),
              ),
            ],
            onChanged: (value) => setState(() => _variantId = value),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _yield,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Yield quantity',
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _yieldUnitId,
                  decoration: const InputDecoration(labelText: 'Yield unit'),
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
                  onChanged: (value) => setState(() => _yieldUnitId = value),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _portion,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Portion multiplier',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text('Ingredients', style: Theme.of(context).textTheme.titleLarge),
          for (var index = 0; index < _lines.length; index++)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: DropdownButtonFormField<String>(
                        initialValue: _lines[index].ingredientId,
                        decoration: const InputDecoration(
                          labelText: 'Ingredient',
                        ),
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
                        onChanged: (value) =>
                            _lines[index].ingredientId = value,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _lines[index].unitId,
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
                        onChanged: (value) => _lines[index].unitId = value,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _lines[index].quantity,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Qty'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _lines[index].wastage,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Waste %'),
                      ),
                    ),
                    IconButton(
                      onPressed: _lines.length == 1
                          ? null
                          : () => setState(() {
                              _lines.removeAt(index).dispose();
                            }),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ],
                ),
              ),
            ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => setState(() => _lines.add(_IngredientLine())),
              icon: const Icon(Icons.add),
              label: const Text('Add ingredient'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty ||
        _menuItemId == null ||
        _yieldUnitId == null ||
        _lines.any(
          (line) => line.ingredientId == null || line.unitId == null,
        )) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complete all required recipe fields.')),
      );
      return;
    }
    setState(() => _saving = true);
    final payload = <String, dynamic>{
      'name': _name.text.trim(),
      'menuItemId': _menuItemId,
      if (_variantId != null) 'variantId': _variantId,
      'yieldUnitId': _yieldUnitId,
      'yieldQuantity': double.parse(_yield.text),
      'portionMultiplier': double.parse(_portion.text),
      'ingredients': [
        for (final line in _lines)
          {
            'ingredientId': line.ingredientId,
            'unitId': line.unitId,
            'quantity': double.parse(line.quantity.text),
            'wastagePercentage': double.parse(line.wastage.text),
          },
      ],
    };
    try {
      final repository = ref.read(recipesRepositoryProvider);
      if (widget.recipeId == null) {
        await repository.create(payload);
      } else {
        await repository.update(widget.recipeId!, payload);
      }
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class _IngredientLine {
  _IngredientLine({
    this.ingredientId,
    this.unitId,
    double quantity = 1,
    double wastage = 0,
  }) : quantity = TextEditingController(text: '$quantity'),
       wastage = TextEditingController(text: '$wastage');

  String? ingredientId;
  String? unitId;
  final TextEditingController quantity;
  final TextEditingController wastage;

  void dispose() {
    quantity.dispose();
    wastage.dispose();
  }
}
