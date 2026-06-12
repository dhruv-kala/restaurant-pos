import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/employees_providers.dart';

class PerformanceScreen extends ConsumerWidget {
  const PerformanceScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final performance = ref.watch(performanceProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Staff Performance')),
      body: performance.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (data) => ListView.builder(
          itemCount: data.length,
          itemBuilder: (_, index) {
            final row = data[index];
            return Card(
              child: ListTile(
                title: Text(row.employeeId),
                subtitle: Text(
                  '${row.ordersHandled} orders | ${row.itemsProcessed} items | '
                  '${row.averagePrepMinutes.toStringAsFixed(1)} min prep',
                ),
                trailing: Text('${row.salesAmount}'),
              ),
            );
          },
        ),
      ),
    );
  }
}
