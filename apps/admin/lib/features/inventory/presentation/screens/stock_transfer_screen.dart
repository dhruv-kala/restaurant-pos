import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/inventory_providers.dart';

class StockTransferScreen extends ConsumerStatefulWidget {
  const StockTransferScreen({super.key});
  @override
  ConsumerState<StockTransferScreen> createState() =>
      _StockTransferScreenState();
}

class _StockTransferScreenState extends ConsumerState<StockTransferScreen> {
  final ingredient = TextEditingController();
  final source = TextEditingController();
  final target = TextEditingController();
  final quantity = TextEditingController();

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Stock Transfer')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: ingredient,
          decoration: const InputDecoration(labelText: 'Ingredient ID'),
        ),
        TextField(
          controller: source,
          decoration: const InputDecoration(labelText: 'From Outlet ID'),
        ),
        TextField(
          controller: target,
          decoration: const InputDecoration(labelText: 'To Outlet ID'),
        ),
        TextField(
          controller: quantity,
          decoration: const InputDecoration(labelText: 'Quantity'),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: () async {
            await ref.read(inventoryRepositoryProvider).transferStock({
              'ingredientId': ingredient.text.trim(),
              'fromOutletId': source.text.trim(),
              'toOutletId': target.text.trim(),
              'quantity': double.parse(quantity.text),
            });
            if (context.mounted) Navigator.pop(context);
          },
          child: const Text('Transfer'),
        ),
      ],
    ),
  );
}
