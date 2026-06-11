import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/billing_providers.dart';

class SplitBillScreen extends ConsumerStatefulWidget {
  const SplitBillScreen({required this.billId, super.key});
  final String billId;

  @override
  ConsumerState<SplitBillScreen> createState() => _SplitBillScreenState();
}

class _SplitBillScreenState extends ConsumerState<SplitBillScreen> {
  SplitBillMode mode = SplitBillMode.equal;
  final value = TextEditingController(text: '2');
  bool submitting = false;

  @override
  void dispose() {
    value.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bill = ref.watch(billDetailsProvider(widget.billId));
    return Scaffold(
      appBar: AppBar(title: const Text('Split Bill')),
      body: bill.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load bill',
          message: error.toString(),
        ),
        data: (bill) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            Text(bill.billNumber),
            DropdownButtonFormField<SplitBillMode>(
              initialValue: mode,
              decoration: const InputDecoration(labelText: 'Split mode'),
              items: SplitBillMode.values
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Text(item.wireName),
                    ),
                  )
                  .toList(),
              onChanged: (next) => setState(() => mode = next!),
            ),
            TextField(
              controller: value,
              decoration: InputDecoration(
                labelText: mode == SplitBillMode.equal
                    ? 'Number of bills'
                    : mode == SplitBillMode.customAmount
                    ? 'Amounts in minor units, comma separated'
                    : 'Item based creates one bill per item',
              ),
              enabled: mode != SplitBillMode.itemBased,
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: submitting ? null : () => _split(bill),
              child: Text(submitting ? 'Splitting...' : 'Split Bill'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _split(Bill bill) async {
    setState(() => submitting = true);
    try {
      final data = <String, dynamic>{'splitMode': mode.wireName};
      if (mode == SplitBillMode.equal) {
        data['splitCount'] = int.parse(value.text.trim());
      } else if (mode == SplitBillMode.customAmount) {
        data['customAmounts'] = value.text
            .split(',')
            .map((item) => int.parse(item.trim()))
            .toList();
      } else {
        data['itemGroups'] = bill.items
            .map(
              (item) => <String, dynamic>{
                'orderItemIds': <String>[item.orderItemId],
              },
            )
            .toList();
      }
      final replacements = await ref
          .read(billingRepositoryProvider)
          .split(bill.id, data);
      ref.invalidate(billsProvider);
      if (mounted) {
        context.go('${AppRoutes.billing}/${replacements.first.id}');
      }
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }
}
