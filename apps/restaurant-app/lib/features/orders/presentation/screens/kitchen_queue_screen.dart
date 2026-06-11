import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../providers/orders_providers.dart';

class KitchenQueueScreen extends ConsumerWidget {
  const KitchenQueueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queue = ref.watch(kitchenQueueProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Kitchen Queue')),
      body: queue.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load kitchen queue',
          message: error.toString(),
        ),
        data: (orders) => ListView(
          padding: const EdgeInsets.all(16),
          children: orders
              .map(
                (order) => AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(order.orderNumber),
                      Text(
                        order.items
                            .map((item) => '${item.quantity}x ${item.itemName}')
                            .join(', '),
                      ),
                      Text(
                        'Waiting ${DateTime.now().difference(order.createdAt).inMinutes} min',
                      ),
                      FilledButton(
                        onPressed: () async {
                          final next = switch (order.status) {
                            OrderStatus.pending => OrderStatus.accepted,
                            OrderStatus.accepted => OrderStatus.preparing,
                            _ => OrderStatus.ready,
                          };
                          await ref
                              .read(ordersRepositoryProvider)
                              .status(order.id, next);
                          ref.invalidate(kitchenQueueProvider);
                        },
                        child: Text(
                          order.status == OrderStatus.preparing
                              ? 'Mark Ready'
                              : 'Advance Status',
                        ),
                      ),
                    ],
                  ),
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}
