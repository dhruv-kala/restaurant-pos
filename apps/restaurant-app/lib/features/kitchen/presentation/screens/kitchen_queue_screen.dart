import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../domain/kitchen_query.dart';
import '../providers/kitchen_providers.dart';

class KitchenQueueScreen extends ConsumerStatefulWidget {
  const KitchenQueueScreen({super.key});

  @override
  ConsumerState<KitchenQueueScreen> createState() => _KitchenQueueScreenState();
}

class _KitchenQueueScreenState extends ConsumerState<KitchenQueueScreen> {
  String? stationId;
  KitchenPriority? priority;
  String search = '';

  @override
  Widget build(BuildContext context) {
    final query = KitchenQuery(
      stationId: stationId,
      priority: priority,
      search: search,
    );
    final queue = ref.watch(kitchenQueueProvider(query));
    final stations = ref.watch(stationProvider);
    final roles =
        ref.watch(authNotifierProvider).user?.roles ?? const <String>[];
    final canUpdate = roles.any(
      <String>{
        'SUPER_ADMIN',
        'TENANT_ADMIN',
        'MANAGER',
        'KITCHEN_STAFF',
      }.contains,
    );
    return Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.all(12),
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: <Widget>[
              SizedBox(
                width: 220,
                child: TextField(
                  decoration: const InputDecoration(
                    labelText: 'Search order',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (value) => setState(() => search = value),
                ),
              ),
              SizedBox(
                width: 200,
                child: stations.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (error, stack) => Text(error.toString()),
                  data: (values) => DropdownButtonFormField<String?>(
                    initialValue: stationId,
                    decoration: const InputDecoration(labelText: 'Station'),
                    items: <DropdownMenuItem<String?>>[
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...values.map(
                        (station) => DropdownMenuItem(
                          value: station.id,
                          child: Text(station.name),
                        ),
                      ),
                    ],
                    onChanged: (value) => setState(() => stationId = value),
                  ),
                ),
              ),
              SizedBox(
                width: 180,
                child: DropdownButtonFormField<KitchenPriority?>(
                  initialValue: priority,
                  decoration: const InputDecoration(labelText: 'Priority'),
                  items: <DropdownMenuItem<KitchenPriority?>>[
                    const DropdownMenuItem(value: null, child: Text('All')),
                    ...KitchenPriority.values.map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(value.wireName),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => priority = value),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: queue.when(
            loading: () => const AppLoading(),
            error: (error, stack) => AppEmptyState(
              title: 'Unable to load kitchen queue',
              message: error.toString(),
            ),
            data: (orders) => orders.isEmpty
                ? const AppEmptyState(title: 'Kitchen queue is clear')
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 480,
                          mainAxisExtent: 380,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                    itemCount: orders.length,
                    itemBuilder: (context, index) => _KitchenOrderCard(
                      order: orders[index],
                      canUpdate: canUpdate,
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}

class _KitchenOrderCard extends ConsumerWidget {
  const _KitchenOrderCard({required this.order, required this.canUpdate});
  final KitchenQueueOrder order;
  final bool canUpdate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final critical = order.items.any(
      (item) => item.slaStatus == KitchenSlaStatus.delayed,
    );
    final warning = order.items.any(
      (item) => item.slaStatus == KitchenSlaStatus.atRisk,
    );
    final color = critical
        ? Colors.red.shade100
        : warning
        ? Colors.orange.shade100
        : Colors.green.shade100;
    return Card(
      color: color,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    order.orderNumber,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Chip(label: Text(order.priority.wireName)),
              ],
            ),
            Text(
              '${order.table?['displayName'] ?? order.table?['tableNumber'] ?? 'No table'}'
              ' - ${order.elapsedMinutes} min',
            ),
            if (order.waiter?['displayName'] != null)
              Text('Waiter: ${order.waiter!['displayName']}'),
            const Divider(),
            Expanded(
              child: ListView(
                children: order.items
                    .map(
                      (item) => ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          '${item.orderItem.quantity}x ${item.orderItem.itemName}',
                        ),
                        subtitle: Text(
                          '${item.kitchenStation?.name ?? 'Unrouted'} - '
                          '${item.elapsedMinutes} elapsed / '
                          '${item.remainingMinutes} remaining',
                        ),
                        trailing: canUpdate
                            ? _ItemAction(item: item)
                            : Text(item.orderItem.status.wireName),
                      ),
                    )
                    .toList(growable: false),
              ),
            ),
            if (canUpdate) _OrderAction(order: order),
          ],
        ),
      ),
    );
  }
}

class _ItemAction extends ConsumerWidget {
  const _ItemAction({required this.item});
  final KitchenQueueItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = item.orderItem.status;
    final next = switch (status) {
      OrderItemStatus.pending => OrderItemStatus.preparing,
      OrderItemStatus.preparing => OrderItemStatus.ready,
      OrderItemStatus.ready => OrderItemStatus.served,
      _ => null,
    };
    return IconButton.filledTonal(
      onPressed: next == null
          ? null
          : () async {
              await ref
                  .read(kitchenRepositoryProvider)
                  .updateItem(item.orderItem.id, next);
              ref.invalidate(kitchenQueueProvider);
              ref.invalidate(kitchenMetricsProvider);
            },
      icon: const Icon(Icons.navigate_next),
      tooltip: next?.wireName,
    );
  }
}

class _OrderAction extends ConsumerWidget {
  const _OrderAction({required this.order});
  final KitchenQueueOrder order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final next = switch (order.status) {
      OrderStatus.pending || OrderStatus.accepted => OrderStatus.preparing,
      OrderStatus.preparing => OrderStatus.ready,
      OrderStatus.ready => OrderStatus.served,
      OrderStatus.served => OrderStatus.completed,
      _ => null,
    };
    return FilledButton(
      onPressed: next == null
          ? null
          : () async {
              await ref
                  .read(kitchenRepositoryProvider)
                  .updateOrder(order.id, next);
              ref.invalidate(kitchenQueueProvider);
              ref.invalidate(kitchenMetricsProvider);
            },
      child: Text(next == null ? 'Completed' : 'Mark ${next.wireName}'),
    );
  }
}
