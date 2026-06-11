import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../../domain/bill_query.dart';
import '../providers/billing_providers.dart';

class BillListScreen extends ConsumerStatefulWidget {
  const BillListScreen({super.key});

  @override
  ConsumerState<BillListScreen> createState() => _BillListScreenState();
}

class _BillListScreenState extends ConsumerState<BillListScreen> {
  BillStatus? status;
  String search = '';

  @override
  Widget build(BuildContext context) {
    final query = BillQuery(
      status: status,
      billNumber: search.trim().isEmpty ? null : search.trim(),
    );
    final value = ref.watch(billsProvider(query));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bills'),
        actions: <Widget>[
          IconButton(
            onPressed: () => context.push(AppRoutes.mergeBills),
            icon: const Icon(Icons.merge),
            tooltip: 'Merge bills',
          ),
        ],
      ),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.all(16),
            child: Wrap(
              spacing: 12,
              runSpacing: 12,
              children: <Widget>[
                SizedBox(
                  width: 280,
                  child: TextField(
                    decoration: const InputDecoration(
                      labelText: 'Bill number',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (value) => setState(() => search = value),
                  ),
                ),
                DropdownButton<BillStatus?>(
                  value: status,
                  hint: const Text('All statuses'),
                  items: <DropdownMenuItem<BillStatus?>>[
                    const DropdownMenuItem(value: null, child: Text('All')),
                    ...BillStatus.values.map(
                      (item) => DropdownMenuItem(
                        value: item,
                        child: Text(item.wireName),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => status = value),
                ),
              ],
            ),
          ),
          Expanded(
            child: value.when(
              loading: () => const AppLoading(),
              error: (error, stack) => AppEmptyState(
                title: 'Unable to load bills',
                message: error.toString(),
              ),
              data: (response) => RefreshIndicator(
                onRefresh: () => ref.refresh(billsProvider(query).future),
                child: response.data.isEmpty
                    ? ListView(
                        children: const <Widget>[
                          SizedBox(height: 160),
                          AppEmptyState(title: 'No bills found'),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: response.data.length,
                        itemBuilder: (context, index) {
                          final bill = response.data[index];
                          return AppCard(
                            child: ListTile(
                              title: Text(bill.billNumber),
                              subtitle: Text(
                                '${bill.order['orderNumber']} - '
                                '${bill.status.wireName}',
                              ),
                              trailing: Text(_money(bill)),
                              onTap: () => context.push(
                                '${AppRoutes.billing}/${bill.id}',
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _money(Bill bill) =>
      '${bill.currencyCode} ${(bill.grandTotal / 100).toStringAsFixed(2)}';
}
