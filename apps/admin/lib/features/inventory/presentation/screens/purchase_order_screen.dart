import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/inventory_query.dart';
import '../providers/inventory_providers.dart';

class PurchaseOrderScreen extends ConsumerWidget {
  const PurchaseOrderScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = InventoryQuery();
    final orders = ref.watch(purchaseOrdersProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Purchase Orders')),
      body: orders.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(error.toString())),
        data: (page) => ListView.builder(
          itemCount: page.data.length,
          itemBuilder: (context, index) {
            final order = page.data[index];
            return ListTile(
              title: Text(order.poNumber),
              subtitle: Text('${order.vendor.name} | ${order.status.name}'),
              trailing: _action(ref, order.id, order.status.name, query),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _create(context, ref, query),
        icon: const Icon(Icons.add),
        label: const Text('Purchase Order'),
      ),
    );
  }

  Widget _action(
    WidgetRef ref,
    String id,
    String status,
    InventoryQuery query,
  ) {
    final (label, nextStatus) = switch (status) {
      'draft' => ('Submit', 'PENDING'),
      'pending' => ('Approve', 'APPROVED'),
      'approved' => ('Receive', null),
      _ => ('', null),
    };
    if (label.isEmpty) return const SizedBox.shrink();
    return FilledButton(
      onPressed: () async {
        if (nextStatus == null) {
          await ref.read(inventoryRepositoryProvider).receivePurchaseOrder(id);
        } else {
          await ref.read(inventoryRepositoryProvider).updatePurchaseOrder(id, {
            'status': nextStatus,
          });
        }
        ref.invalidate(purchaseOrdersProvider(query));
      },
      child: Text(label),
    );
  }

  Future<void> _create(
    BuildContext context,
    WidgetRef ref,
    InventoryQuery query,
  ) async {
    final outlet = TextEditingController();
    final vendor = TextEditingController();
    final ingredient = TextEditingController();
    final quantity = TextEditingController(text: '1');
    final unitCost = TextEditingController(text: '0');
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Purchase Order'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: outlet,
                decoration: const InputDecoration(labelText: 'Outlet ID'),
              ),
              TextField(
                controller: vendor,
                decoration: const InputDecoration(labelText: 'Vendor ID'),
              ),
              TextField(
                controller: ingredient,
                decoration: const InputDecoration(labelText: 'Ingredient ID'),
              ),
              TextField(
                controller: quantity,
                decoration: const InputDecoration(labelText: 'Quantity'),
              ),
              TextField(
                controller: unitCost,
                decoration: const InputDecoration(labelText: 'Unit cost minor'),
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
    );
    if (accepted != true) return;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    await ref.read(inventoryRepositoryProvider).createPurchaseOrder({
      'outletId': outlet.text.trim(),
      'vendorId': vendor.text.trim(),
      'orderDate': today,
      'items': [
        {
          'ingredientId': ingredient.text.trim(),
          'quantity': double.parse(quantity.text),
          'unitCost': int.parse(unitCost.text),
        },
      ],
    });
    ref.invalidate(purchaseOrdersProvider(query));
  }
}
