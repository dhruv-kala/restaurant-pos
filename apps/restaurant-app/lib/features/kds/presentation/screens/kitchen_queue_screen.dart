import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../domain/kds_query.dart';
import '../providers/kds_providers.dart';
import '../widgets/kitchen_queue_card.dart';

class KdsQueueScreen extends ConsumerStatefulWidget {
  const KdsQueueScreen({super.key});

  @override
  ConsumerState<KdsQueueScreen> createState() => _KdsQueueScreenState();
}

class _KdsQueueScreenState extends ConsumerState<KdsQueueScreen> {
  String? _categoryId;
  OrderPriority? _priority;
  OrderStatus? _status;
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final query = KdsQuery(
      kitchenCategoryId: _categoryId,
      priority: _priority,
      status: _status,
      search: _search,
    );
    final queue = ref.watch(kitchenQueueProvider(query));
    final categories = ref.watch(kitchenCategoriesProvider);
    final roles =
        ref.watch(authNotifierProvider).user?.roles ?? const <String>[];
    final canUpdate =
        roles.contains('KITCHEN_STAFF') ||
        roles.contains('TENANT_ADMIN') ||
        roles.contains('SUPER_ADMIN');
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
                  onChanged: (value) => setState(() => _search = value),
                ),
              ),
              SizedBox(
                width: 180,
                child: DropdownButtonFormField<OrderPriority?>(
                  initialValue: _priority,
                  decoration: const InputDecoration(labelText: 'Priority'),
                  items: <DropdownMenuItem<OrderPriority?>>[
                    const DropdownMenuItem(value: null, child: Text('All')),
                    ...OrderPriority.values.map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(value.wireName),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => _priority = value),
                ),
              ),
              SizedBox(
                width: 180,
                child: DropdownButtonFormField<OrderStatus?>(
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: <DropdownMenuItem<OrderStatus?>>[
                    const DropdownMenuItem(value: null, child: Text('All')),
                    ...[
                      OrderStatus.pending,
                      OrderStatus.accepted,
                      OrderStatus.preparing,
                      OrderStatus.ready,
                    ].map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(value.wireName),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => _status = value),
                ),
              ),
              SizedBox(
                width: 200,
                child: categories.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (error, stack) => Text(error.toString()),
                  data: (values) => DropdownButtonFormField<String?>(
                    initialValue: _categoryId,
                    decoration: const InputDecoration(labelText: 'Station'),
                    items: <DropdownMenuItem<String?>>[
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...values.map(
                        (value) => DropdownMenuItem(
                          value: value.id,
                          child: Text(value.name),
                        ),
                      ),
                    ],
                    onChanged: (value) => setState(() => _categoryId = value),
                  ),
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
            data: (tickets) => RefreshIndicator(
              onRefresh: () => ref.refresh(kitchenQueueProvider(query).future),
              child: tickets.isEmpty
                  ? ListView(
                      children: const <Widget>[
                        SizedBox(height: 160),
                        AppEmptyState(title: 'Kitchen queue is clear'),
                      ],
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate:
                          const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 480,
                            mainAxisExtent: 360,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                      itemCount: tickets.length,
                      itemBuilder: (context, index) => KitchenQueueCard(
                        ticket: tickets[index],
                        canUpdate: canUpdate,
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }
}
