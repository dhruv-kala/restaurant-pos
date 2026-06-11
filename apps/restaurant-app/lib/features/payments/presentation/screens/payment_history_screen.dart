import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../../domain/payment_query.dart';
import '../providers/payments_providers.dart';

class PaymentHistoryScreen extends ConsumerStatefulWidget {
  const PaymentHistoryScreen({super.key});

  @override
  ConsumerState<PaymentHistoryScreen> createState() =>
      _PaymentHistoryScreenState();
}

class _PaymentHistoryScreenState extends ConsumerState<PaymentHistoryScreen> {
  PaymentStatus? status;
  PaymentMethod? method;

  @override
  Widget build(BuildContext context) {
    final query = PaymentQuery(status: status, paymentMethod: method);
    final value = ref.watch(paymentsListProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Payment History')),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: DropdownButtonFormField<PaymentStatus?>(
                    initialValue: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: <DropdownMenuItem<PaymentStatus?>>[
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...PaymentStatus.values.map(
                        (item) => DropdownMenuItem(
                          value: item,
                          child: Text(item.wireName),
                        ),
                      ),
                    ],
                    onChanged: (value) => setState(() => status = value),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<PaymentMethod?>(
                    initialValue: method,
                    decoration: const InputDecoration(labelText: 'Method'),
                    items: <DropdownMenuItem<PaymentMethod?>>[
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...PaymentMethod.values.map(
                        (item) => DropdownMenuItem(
                          value: item,
                          child: Text(item.wireName),
                        ),
                      ),
                    ],
                    onChanged: (value) => setState(() => method = value),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: value.when(
              loading: () => const AppLoading(),
              error: (error, stack) => AppEmptyState(
                title: 'Unable to load payments',
                message: error.toString(),
              ),
              data: (response) => RefreshIndicator(
                onRefresh: () =>
                    ref.refresh(paymentsListProvider(query).future),
                child: response.data.isEmpty
                    ? ListView(
                        children: const <Widget>[
                          SizedBox(height: 160),
                          AppEmptyState(title: 'No payments found'),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: response.data.length,
                        itemBuilder: (context, index) {
                          final payment = response.data[index];
                          return AppCard(
                            child: ListTile(
                              title: Text(payment.paymentNumber),
                              subtitle: Text(
                                '${payment.bill['billNumber']} - '
                                '${payment.status.wireName}',
                              ),
                              trailing: Text(
                                '${payment.bill['currencyCode']} '
                                '${(payment.paidAmount / 100).toStringAsFixed(2)}',
                              ),
                              onTap: () => context.push(
                                '${AppRoutes.payments}/${payment.id}',
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
}
