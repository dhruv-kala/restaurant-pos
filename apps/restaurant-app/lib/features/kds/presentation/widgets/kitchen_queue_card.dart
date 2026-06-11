import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../providers/kds_providers.dart';

class KitchenQueueCard extends ConsumerWidget {
  const KitchenQueueCard({
    required this.ticket,
    required this.canUpdate,
    super.key,
  });

  final KitchenTicket ticket;
  final bool canUpdate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final delayed = ticket.items.any(
      (item) => item.slaStatus == KitchenSlaStatus.delayed,
    );
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  ticket.orderNumber,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              Chip(
                label: Text(ticket.priority.wireName),
                backgroundColor: _priorityColor(ticket.priority),
              ),
              const SizedBox(width: 8),
              Chip(
                label: Text(delayed ? 'DELAYED' : ticket.status.wireName),
                backgroundColor: delayed
                    ? Colors.red.shade200
                    : _statusColor(ticket.status),
              ),
            ],
          ),
          Text('${_table()} - ${ticket.orderType.wireName}'),
          Text(
            'Waiting ${DateTime.now().difference(ticket.createdAt).inMinutes} min',
          ),
          const Divider(),
          ...ticket.items.map(
            (queueItem) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                '${queueItem.orderItem.quantity}x '
                '${queueItem.orderItem.itemName}',
              ),
              subtitle: Text(
                '${queueItem.kitchenCategory?.name ?? 'Unrouted'} - '
                '${queueItem.preparationMinutes}/'
                '${queueItem.orderItem.estimatedPrepMinutes} min',
              ),
              trailing: canUpdate
                  ? _ItemAction(item: queueItem)
                  : Text(queueItem.orderItem.status.wireName),
            ),
          ),
          if (delayed)
            const Text(
              'SLA DELAYED',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
            ),
          if (canUpdate)
            Wrap(
              spacing: 8,
              children: <Widget>[
                if (ticket.status == OrderStatus.pending ||
                    ticket.status == OrderStatus.accepted)
                  FilledButton(
                    onPressed: () => _run(
                      ref,
                      ref.read(kdsRepositoryProvider).startOrder(ticket.id),
                    ),
                    child: const Text('Start Order'),
                  ),
                if (ticket.status == OrderStatus.preparing)
                  FilledButton(
                    onPressed: () => _run(
                      ref,
                      ref.read(kdsRepositoryProvider).readyOrder(ticket.id),
                    ),
                    child: const Text('Ready Order'),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  String _table() =>
      ticket.table?['displayName'] as String? ??
      ticket.table?['tableNumber'] as String? ??
      'No table';

  Future<void> _run(WidgetRef ref, Future<KitchenTicket> operation) async {
    await operation;
    ref.invalidate(kitchenQueueProvider);
    ref.invalidate(activeOrdersProvider);
    ref.invalidate(readyOrdersProvider);
    ref.invalidate(completedOrdersProvider);
  }

  Color? _priorityColor(OrderPriority priority) => switch (priority) {
    OrderPriority.normal => null,
    OrderPriority.high => Colors.orange.shade200,
    OrderPriority.vip => Colors.red.shade200,
    OrderPriority.urgent => Colors.red.shade400,
  };

  Color _statusColor(OrderStatus status) => switch (status) {
    OrderStatus.pending || OrderStatus.accepted => Colors.grey.shade300,
    OrderStatus.preparing => Colors.blue.shade200,
    OrderStatus.ready => Colors.green.shade200,
    _ => Colors.grey.shade200,
  };
}

class _ItemAction extends ConsumerWidget {
  const _ItemAction({required this.item});
  final KitchenQueueItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderItem = item.orderItem;
    final (label, action) = switch (orderItem.status) {
      OrderItemStatus.pending => (
        'Start',
        ref.read(kdsRepositoryProvider).startItem,
      ),
      OrderItemStatus.preparing => (
        'Ready',
        ref.read(kdsRepositoryProvider).readyItem,
      ),
      OrderItemStatus.ready => (
        'Served',
        ref.read(kdsRepositoryProvider).servedItem,
      ),
      _ => ('Done', null),
    };
    return FilledButton.tonal(
      onPressed: action == null
          ? null
          : () async {
              await action(orderItem.id);
              ref.invalidate(kitchenQueueProvider);
              ref.invalidate(activeOrdersProvider);
              ref.invalidate(readyOrdersProvider);
              ref.invalidate(completedOrdersProvider);
            },
      child: Text(label),
    );
  }
}
