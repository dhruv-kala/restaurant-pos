import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../providers/kitchen_providers.dart';

class KitchenAnalyticsScreen extends ConsumerWidget {
  const KitchenAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metrics = ref.watch(kitchenMetricsProvider(null));
    return metrics.when(
      loading: () => const AppLoading(),
      error: (error, stack) => AppEmptyState(
        title: 'Unable to load kitchen metrics',
        message: error.toString(),
      ),
      data: (value) => GridView.count(
        padding: const EdgeInsets.all(20),
        crossAxisCount: MediaQuery.sizeOf(context).width > 700 ? 3 : 2,
        childAspectRatio: 1.5,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        children: <Widget>[
          _MetricCard(
            label: 'Average Prep',
            value: '${value.averagePrepTimeMinutes} min',
            color: Colors.blue,
          ),
          _MetricCard(
            label: 'Orders Completed',
            value: '${value.ordersCompleted}',
            color: Colors.green,
          ),
          _MetricCard(
            label: 'Items Completed',
            value: '${value.itemsCompleted}',
            color: Colors.green,
          ),
          _MetricCard(
            label: 'Delayed Orders',
            value: '${value.delayedOrders}',
            color: Colors.orange,
          ),
          _MetricCard(
            label: 'Delayed Items',
            value: '${value.delayedItems}',
            color: Colors.red,
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(value, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: color)),
          ],
        ),
      ),
    );
  }
}
