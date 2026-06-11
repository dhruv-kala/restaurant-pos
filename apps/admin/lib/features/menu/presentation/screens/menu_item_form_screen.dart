import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../domain/menu_query.dart';
import '../providers/menu_providers.dart';

class MenuItemFormScreen extends ConsumerStatefulWidget {
  const MenuItemFormScreen({super.key, this.item});

  final MenuItem? item;

  @override
  ConsumerState<MenuItemFormScreen> createState() => _MenuItemFormScreenState();
}

class _MenuItemFormScreenState extends ConsumerState<MenuItemFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _description;
  late final TextEditingController _sku;
  late final TextEditingController _price;
  late final TextEditingController _costPrice;
  late final TextEditingController _tax;
  late final TextEditingController _imageUrl;
  late final TextEditingController _variants;
  late final TextEditingController _addons;
  String? _categoryId;
  bool _isVegetarian = false;
  bool _isVegan = false;
  bool _isAvailable = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final item = widget.item;
    _name = TextEditingController(text: item?.name);
    _description = TextEditingController(text: item?.description);
    _sku = TextEditingController(text: item?.sku);
    _price = TextEditingController(text: item?.priceMinor.toString());
    _costPrice = TextEditingController(text: item?.costPriceMinor?.toString());
    _tax = TextEditingController(text: item?.taxPercentage.toString() ?? '0');
    _imageUrl = TextEditingController(text: item?.imageUrl);
    _variants = TextEditingController(
      text: item?.variants.map((variant) => variant.name).join(', '),
    );
    _addons = TextEditingController(
      text: item?.addons.map((addon) => addon.name).join(', '),
    );
    _categoryId = item?.categoryId;
    _isVegetarian = item?.isVegetarian ?? false;
    _isVegan = item?.isVegan ?? false;
    _isAvailable = item?.isAvailable ?? true;
  }

  @override
  void dispose() {
    for (final controller in <TextEditingController>[
      _name,
      _description,
      _sku,
      _price,
      _costPrice,
      _tax,
      _imageUrl,
      _variants,
      _addons,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoryProvider(const MenuQuery(limit: 100)));
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.item == null ? 'Add Menu Item' : 'Edit Menu Item'),
      ),
      body: categories.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load categories',
          message: error.toString(),
        ),
        data: (response) => SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: Form(
                key: _formKey,
                child: Column(
                  children: <Widget>[
                    DropdownButtonFormField<String>(
                      initialValue: _categoryId,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: response.data
                          .map(
                            (category) => DropdownMenuItem<String>(
                              value: category.id,
                              child: Text(category.name),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (value) => _categoryId = value,
                      validator: (value) =>
                          value == null ? 'Category is required' : null,
                    ),
                    const SizedBox(height: 16),
                    AppTextField(
                      controller: _name,
                      label: 'Name',
                      validator: _required,
                    ),
                    const SizedBox(height: 16),
                    AppTextField(
                      controller: _description,
                      label: 'Description',
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: AppTextField(controller: _sku, label: 'SKU'),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: AppTextField(
                            controller: _price,
                            label: 'Price (minor units)',
                            keyboardType: TextInputType.number,
                            validator: _positiveInteger,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: AppTextField(
                            controller: _costPrice,
                            label: 'Cost price (minor units)',
                            keyboardType: TextInputType.number,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: AppTextField(
                            controller: _tax,
                            label: 'Tax percentage',
                            keyboardType: TextInputType.number,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    AppTextField(controller: _imageUrl, label: 'Image URL'),
                    const SizedBox(height: 16),
                    AppTextField(
                      controller: _variants,
                      label: 'Variants (comma separated)',
                    ),
                    const SizedBox(height: 16),
                    AppTextField(
                      controller: _addons,
                      label: 'Add-ons (comma separated)',
                    ),
                    SwitchListTile(
                      value: _isVegetarian,
                      onChanged: (value) =>
                          setState(() => _isVegetarian = value),
                      title: const Text('Vegetarian'),
                    ),
                    SwitchListTile(
                      value: _isVegan,
                      onChanged: (value) => setState(() => _isVegan = value),
                      title: const Text('Vegan'),
                    ),
                    SwitchListTile(
                      value: _isAvailable,
                      onChanged: (value) =>
                          setState(() => _isAvailable = value),
                      title: const Text('Available'),
                    ),
                    const SizedBox(height: 16),
                    AppButton(
                      label: 'Save Menu Item',
                      isLoading: _saving,
                      onPressed: _saving ? null : _save,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String? _required(String? value) {
    return value == null || value.trim().isEmpty ? 'Name is required' : null;
  }

  String? _positiveInteger(String? value) {
    final parsed = int.tryParse(value ?? '');
    return parsed == null || parsed <= 0 ? 'Enter a positive price' : null;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(menuRepositoryProvider)
          .saveItem(
            id: widget.item?.id,
            payload: <String, dynamic>{
              'categoryId': _categoryId,
              'name': _name.text.trim(),
              'description': _description.text.trim(),
              'sku': _sku.text.trim().isEmpty ? null : _sku.text.trim(),
              'price': int.parse(_price.text),
              'costPrice': int.tryParse(_costPrice.text),
              'taxPercentage': double.tryParse(_tax.text) ?? 0,
              'imageUrl': _imageUrl.text.trim().isEmpty
                  ? null
                  : _imageUrl.text.trim(),
              'isVegetarian': _isVegetarian,
              'isVegan': _isVegan,
              'isAvailable': _isAvailable,
              'variants': _names(_variants.text)
                  .map(
                    (name) => <String, dynamic>{
                      'name': name,
                      'priceAdjustment': 0,
                    },
                  )
                  .toList(growable: false),
              'addons': _names(_addons.text)
                  .map((name) => <String, dynamic>{'name': name, 'price': 0})
                  .toList(growable: false),
            },
          );
      if (mounted) {
        Navigator.of(context).pop();
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  List<String> _names(String value) {
    return value
        .split(',')
        .map((name) => name.trim())
        .where((name) => name.isNotEmpty)
        .toList(growable: false);
  }
}
