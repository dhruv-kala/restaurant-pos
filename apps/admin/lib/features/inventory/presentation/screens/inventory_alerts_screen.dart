import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/inventory_query.dart';
import '../providers/inventory_providers.dart';

class InventoryAlertsScreen extends ConsumerWidget {
  const InventoryAlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = InventoryQuery();
    final alerts = ref.watch(alertsProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Inventory Alerts')),
      body: alerts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(error.toString())),
        data: (page) => page.data.isEmpty
            ? const Center(child: Text('No active inventory alerts'))
            : ListView.builder(
                itemCount: page.data.length,
                itemBuilder: (context, index) {
                  final alert = page.data[index];
                  return ListTile(
                    leading: Icon(
                      alert.alertType.name == 'outOfStock'
                          ? Icons.error
                          : Icons.warning_amber,
                      color: alert.alertType.name == 'outOfStock'
                          ? Colors.red
                          : Colors.orange,
                    ),
                    title: Text(alert.ingredient.name),
                    subtitle: Text(alert.message),
                    trailing: TextButton(
                      onPressed: () async {
                        await ref
                            .read(inventoryRepositoryProvider)
                            .resolveAlert(alert.id);
                        ref.invalidate(alertsProvider(query));
                      },
                      child: const Text('Resolve'),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
