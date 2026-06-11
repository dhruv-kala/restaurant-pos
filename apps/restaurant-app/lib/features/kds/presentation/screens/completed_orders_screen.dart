import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../providers/kds_providers.dart';
import '../widgets/kitchen_queue_card.dart';

class CompletedOrdersScreen extends ConsumerWidget {
  const CompletedOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(completedOrdersProvider);
    return orders.when(
      loading: () => const AppLoading(),
      error: (error, stack) => AppEmptyState(
        title: 'Unable to load completed orders',
        message: error.toString(),
      ),
      data: (tickets) => RefreshIndicator(
        onRefresh: () => ref.refresh(completedOrdersProvider.future),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: tickets
              .map(
                (ticket) => KitchenQueueCard(ticket: ticket, canUpdate: false),
              )
              .toList(),
        ),
      ),
    );
  }
}
