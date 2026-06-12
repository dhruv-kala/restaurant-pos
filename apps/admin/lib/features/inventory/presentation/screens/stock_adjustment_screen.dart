import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/inventory_providers.dart';

class StockAdjustmentScreen extends ConsumerStatefulWidget {
  const StockAdjustmentScreen({super.key});
  @override
  ConsumerState<StockAdjustmentScreen> createState() =>
      _StockAdjustmentScreenState();
}

class _StockAdjustmentScreenState extends ConsumerState<StockAdjustmentScreen> {
  final outlet = TextEditingController();
  final ingredient = TextEditingController();
  final quantity = TextEditingController();
  final reason = TextEditingController();
  String type = 'ADJUSTMENT_IN';
  bool saving = false;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Stock Adjustment')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: outlet,
          decoration: const InputDecoration(labelText: 'Outlet ID'),
        ),
        TextField(
          controller: ingredient,
          decoration: const InputDecoration(labelText: 'Ingredient ID'),
        ),
        TextField(
          controller: quantity,
          decoration: const InputDecoration(labelText: 'Quantity'),
        ),
        DropdownButtonFormField<String>(
          initialValue: type,
          items: const [
            DropdownMenuItem(
              value: 'ADJUSTMENT_IN',
              child: Text('Adjustment In'),
            ),
            DropdownMenuItem(
              value: 'ADJUSTMENT_OUT',
              child: Text('Adjustment Out'),
            ),
            DropdownMenuItem(value: 'WASTAGE', child: Text('Wastage')),
            DropdownMenuItem(value: 'RETURN', child: Text('Return')),
          ],
          onChanged: (value) => setState(() => type = value ?? type),
        ),
        TextField(
          controller: reason,
          decoration: const InputDecoration(labelText: 'Reason'),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: saving ? null : _save,
          child: Text(saving ? 'Saving...' : 'Apply Adjustment'),
        ),
      ],
    ),
  );

  Future<void> _save() async {
    setState(() => saving = true);
    try {
      await ref.read(inventoryRepositoryProvider).adjustStock({
        'outletId': outlet.text.trim(),
        'ingredientId': ingredient.text.trim(),
        'quantity': double.parse(quantity.text),
        'transactionType': type,
        'reason': reason.text.trim(),
      });
      if (mounted) Navigator.pop(context);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }
}
