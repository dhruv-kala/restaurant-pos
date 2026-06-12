import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/customers_providers.dart';

class CustomerOrderHistoryScreen extends ConsumerWidget {
  const CustomerOrderHistoryScreen({required this.customerId, super.key});
  final String customerId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Order history')),
    body: FutureBuilder(
      future: ref.read(customersRepositoryProvider).orders(customerId),
      builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
        return ListView(
          children: [
            for (final order in snapshot.data!)
              ListTile(
                title: Text(order['orderNumber']?.toString() ?? 'Order'),
                subtitle: Text(order['status']?.toString() ?? ''),
                trailing: Text('${order['grandTotal'] ?? 0}'),
              ),
          ],
        );
      },
    ),
  );
}
