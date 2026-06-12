import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/customers_providers.dart';
import 'customer_address_screen.dart';
import 'customer_notes_screen.dart';
import 'customer_order_history_screen.dart';
import 'customer_visit_history_screen.dart';
import 'edit_customer_screen.dart';

class CustomerDetailsScreen extends ConsumerWidget {
  const CustomerDetailsScreen({required this.id, super.key});
  final String id;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customer = ref.watch(customerDetailsProvider(id));
    final stats = ref.watch(customerStatsProvider(id));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer details'),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => EditCustomerScreen(customerId: id),
              ),
            ),
            icon: const Icon(Icons.edit),
          ),
        ],
      ),
      body: customer.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (value) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              value.displayName,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            Text(value.phone ?? value.email ?? 'No contact detail'),
            const SizedBox(height: 16),
            stats.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Text('$error'),
              data: (item) => Card(
                child: ListTile(
                  title: Text(
                    '${item.totalOrders} orders · ${item.totalSpend} spent',
                  ),
                  subtitle: Text(
                    'Average ${item.averageOrderValue} · '
                    'Favorite ${item.favoriteOutletName ?? 'Not available'}',
                  ),
                ),
              ),
            ),
            for (final action in <(String, Widget)>[
              ('Addresses', CustomerAddressScreen(customerId: id)),
              ('Notes', CustomerNotesScreen(customerId: id)),
              ('Visit history', CustomerVisitHistoryScreen(customerId: id)),
              ('Order history', CustomerOrderHistoryScreen(customerId: id)),
            ])
              ListTile(
                title: Text(action.$1),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(
                  context,
                ).push(MaterialPageRoute<void>(builder: (_) => action.$2)),
              ),
          ],
        ),
      ),
    );
  }
}
