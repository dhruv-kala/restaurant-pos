import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/orders_providers.dart';

class OrderDetailsScreen extends ConsumerWidget {
  const OrderDetailsScreen({required this.orderId, super.key});
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(orderDetailsProvider(orderId));
    final user = ref.watch(authNotifierProvider).user;
    final role = user == null ? null : RoleAccess.primaryRole(user.roles);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Details'),
        actions: <Widget>[
          IconButton(
            onPressed: () => context.push('${AppRoutes.orders}/$orderId/edit'),
            icon: const Icon(Icons.edit),
          ),
        ],
      ),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load order',
          message: error.toString(),
        ),
        data: (order) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            Text(
              order.orderNumber,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            Text('${order.orderType.wireName} - ${order.status.wireName}'),
            const SizedBox(height: 16),
            ...order.items.map(
              (item) => ListTile(
                title: Text('${item.quantity} x ${item.itemName}'),
                subtitle: Text(
                  item.specialInstructions ?? item.status.wireName,
                ),
                trailing: Text(
                  '${order.currencyCode} ${(item.lineTotal / 100).toStringAsFixed(2)}',
                ),
              ),
            ),
            const Divider(),
            Text(
              'Total: ${order.currencyCode} '
              '${(order.grandTotal / 100).toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 8,
              children: _nextStatuses(order.status)
                  .map(
                    (status) => FilledButton(
                      onPressed: () async {
                        await ref
                            .read(ordersRepositoryProvider)
                            .status(order.id, status);
                        ref.invalidate(orderDetailsProvider(order.id));
                        ref.invalidate(activeOrdersProvider);
                      },
                      child: Text(status.wireName),
                    ),
                  )
                  .toList(),
            ),
            if (order.status == OrderStatus.completed &&
                role != UserRole.waiter)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: FilledButton.icon(
                  onPressed: () =>
                      context.push('${AppRoutes.billing}/generate/${order.id}'),
                  icon: const Icon(Icons.receipt),
                  label: const Text('Generate Bill'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  List<OrderStatus> _nextStatuses(OrderStatus status) => switch (status) {
    OrderStatus.pending => <OrderStatus>[OrderStatus.accepted],
    OrderStatus.accepted => <OrderStatus>[OrderStatus.preparing],
    OrderStatus.preparing => <OrderStatus>[OrderStatus.ready],
    OrderStatus.ready => <OrderStatus>[
      OrderStatus.served,
      OrderStatus.completed,
    ],
    OrderStatus.served => <OrderStatus>[OrderStatus.completed],
    _ => const <OrderStatus>[],
  };
}
