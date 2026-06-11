import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../providers/kds_providers.dart';
import '../widgets/kitchen_queue_card.dart';

class ReadyOrdersScreen extends ConsumerWidget {
  const ReadyOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(readyOrdersProvider);
    final roles =
        ref.watch(authNotifierProvider).user?.roles ?? const <String>[];
    final canUpdate = roles.contains('KITCHEN_STAFF');
    return orders.when(
      loading: () => const AppLoading(),
      error: (error, stack) => AppEmptyState(
        title: 'Unable to load ready orders',
        message: error.toString(),
      ),
      data: (tickets) => RefreshIndicator(
        onRefresh: () => ref.refresh(readyOrdersProvider.future),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: tickets
              .map(
                (ticket) =>
                    KitchenQueueCard(ticket: ticket, canUpdate: canUpdate),
              )
              .toList(),
        ),
      ),
    );
  }
}
