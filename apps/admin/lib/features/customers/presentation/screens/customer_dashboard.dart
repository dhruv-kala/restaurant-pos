import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/customers_providers.dart';
import 'customer_list_screen.dart';

class CustomerDashboard extends ConsumerWidget {
  const CustomerDashboard({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(customerDashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Customers')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          stats.when(
            loading: () => const LinearProgressIndicator(),
            error: (error, _) => Text('$error'),
            data: (value) => Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _Metric('Total', value.totalCustomers),
                _Metric('New (30d)', value.newCustomers),
                _Metric('Repeat', value.repeatCustomers),
                _Metric('VIP', value.vipCustomers),
                _Metric('Inactive', value.inactiveCustomers),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ListTile(
            leading: const Icon(Icons.people),
            title: const Text('Customer directory'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const CustomerListScreen(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);
  final String label;
  final int value;
  @override
  Widget build(BuildContext context) => Card(
    child: SizedBox(
      width: 145,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text('$value', style: Theme.of(context).textTheme.headlineSmall),
            Text(label),
          ],
        ),
      ),
    ),
  );
}
