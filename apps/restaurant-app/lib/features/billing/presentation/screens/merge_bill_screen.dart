import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../../domain/bill_query.dart';
import '../providers/billing_providers.dart';

class MergeBillScreen extends ConsumerStatefulWidget {
  const MergeBillScreen({super.key});

  @override
  ConsumerState<MergeBillScreen> createState() => _MergeBillScreenState();
}

class _MergeBillScreenState extends ConsumerState<MergeBillScreen> {
  final selected = <String>{};
  bool submitting = false;

  @override
  Widget build(BuildContext context) {
    const query = BillQuery(status: BillStatus.generated);
    final value = ref.watch(billsProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Merge Bills')),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load bills',
          message: error.toString(),
        ),
        data: (response) => Column(
          children: <Widget>[
            Expanded(
              child: ListView(
                children: response.data
                    .map(
                      (bill) => CheckboxListTile(
                        value: selected.contains(bill.id),
                        title: Text(bill.billNumber),
                        subtitle: Text(
                          '${bill.order['orderNumber']} - '
                          '${bill.currencyCode} '
                          '${(bill.grandTotal / 100).toStringAsFixed(2)}',
                        ),
                        onChanged: (checked) => setState(() {
                          checked == true
                              ? selected.add(bill.id)
                              : selected.remove(bill.id);
                        }),
                      ),
                    )
                    .toList(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: selected.length < 2 || submitting ? null : _merge,
                child: Text(submitting ? 'Merging...' : 'Merge Selected'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _merge() async {
    setState(() => submitting = true);
    try {
      final bill = await ref
          .read(billingRepositoryProvider)
          .merge(selected.toList());
      ref.invalidate(billsProvider);
      if (mounted) context.go('${AppRoutes.billing}/${bill.id}');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }
}
