import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../../domain/order_query.dart';
import '../providers/orders_providers.dart';

class OrderListScreen extends ConsumerWidget {
  const OrderListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = OrderQuery();
    final orders = ref.watch(activeOrdersProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: orders.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load orders',
          message: error.toString(),
        ),
        data: (response) => RefreshIndicator(
          onRefresh: () => ref.refresh(activeOrdersProvider(query).future),
          child: response.data.isEmpty
              ? ListView(
                  children: <Widget>[
                    const SizedBox(height: 180),
                    const AppEmptyState(title: 'No orders found'),
                  ],
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: response.data.length,
                  itemBuilder: (context, index) {
                    final order = response.data[index];
                    return AppCard(
                      child: ListTile(
                        title: Text(order.orderNumber),
                        subtitle: Text(
                          '${_table(order)} - ${order.orderType.wireName}\n'
                          '${order.createdAt.toLocal()}',
                        ),
                        isThreeLine: true,
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: <Widget>[
                            Text(order.status.wireName),
                            Text(_money(order)),
                          ],
                        ),
                        onTap: () =>
                            context.push('${AppRoutes.orders}/${order.id}'),
                      ),
                    );
                  },
                ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.createOrder),
        icon: const Icon(Icons.add),
        label: const Text('New Order'),
      ),
    );
  }

  String _table(Order order) =>
      order.table?['displayName'] as String? ??
      order.table?['tableNumber'] as String? ??
      'No table';
  String _money(Order order) =>
      '${order.currencyCode} ${(order.grandTotal / 100).toStringAsFixed(2)}';
}
