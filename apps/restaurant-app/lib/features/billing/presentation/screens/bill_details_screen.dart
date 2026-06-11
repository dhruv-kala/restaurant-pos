import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/billing_providers.dart';

class BillDetailsScreen extends ConsumerWidget {
  const BillDetailsScreen({required this.billId, super.key});
  final String billId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(billDetailsProvider(billId));
    final user = ref.watch(authNotifierProvider).user;
    final role = user == null ? null : RoleAccess.primaryRole(user.roles);
    final canWrite = role != UserRole.waiter;
    return Scaffold(
      appBar: AppBar(title: const Text('Bill Details')),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load bill',
          message: error.toString(),
        ),
        data: (bill) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            Text(
              bill.billNumber,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            Text('${bill.order['orderNumber']} - ${bill.status.wireName}'),
            Text(_tableAndCustomer(bill)),
            const Divider(height: 32),
            ...bill.items.map(
              (item) => ListTile(
                title: Text('${item.quantity} x ${item.name}'),
                subtitle: Text('Tax ${item.taxPercentage}%'),
                trailing: Text(_money(bill.currencyCode, item.lineTotal)),
              ),
            ),
            const Divider(),
            _total('Subtotal', bill.subtotal, bill.currencyCode),
            _total('Discount', -bill.discountAmount, bill.currencyCode),
            ...bill.taxes.map(
              (tax) => _total(
                '${tax.taxName} ${tax.taxRate}%',
                tax.taxAmount,
                bill.currencyCode,
              ),
            ),
            _total(
              'Service charge',
              bill.serviceChargeAmount,
              bill.currencyCode,
            ),
            _total('Round off', bill.roundOffAmount, bill.currencyCode),
            _total(
              'Grand total',
              bill.grandTotal,
              bill.currencyCode,
              bold: true,
            ),
            _total('Paid', bill.paidAmount, bill.currencyCode),
            _total('Refunded', -bill.refundedAmount, bill.currencyCode),
            _total(
              'Outstanding',
              bill.outstandingAmount,
              bill.currencyCode,
              bold: true,
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                OutlinedButton.icon(
                  onPressed: () async {
                    await ref
                        .read(billingRepositoryProvider)
                        .printable(bill.id);
                    ref.invalidate(billDetailsProvider(bill.id));
                  },
                  icon: const Icon(Icons.print),
                  label: Text(bill.printCount == 0 ? 'Print' : 'Reprint'),
                ),
                if (canWrite && bill.status == BillStatus.generated)
                  FilledButton.icon(
                    onPressed: bill.outstandingAmount > 0
                        ? () => context.push(
                            '${AppRoutes.payments}/pay/${bill.id}',
                          )
                        : null,
                    icon: const Icon(Icons.payments),
                    label: const Text('Take Payment'),
                  ),
                if (canWrite && bill.status == BillStatus.generated)
                  OutlinedButton.icon(
                    onPressed: () =>
                        context.push('${AppRoutes.billing}/${bill.id}/split'),
                    icon: const Icon(Icons.call_split),
                    label: const Text('Split'),
                  ),
                if (canWrite && bill.status == BillStatus.generated)
                  FilledButton.tonalIcon(
                    onPressed: () => _void(context, ref, bill),
                    icon: const Icon(Icons.block),
                    label: const Text('Void'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _void(BuildContext context, WidgetRef ref, Bill bill) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Void bill'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Reason'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => context.pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => context.pop(controller.text.trim()),
            child: const Text('Void'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (reason == null || reason.isEmpty) return;
    await ref.read(billingRepositoryProvider).voidBill(bill.id, reason);
    ref.invalidate(billDetailsProvider(bill.id));
    ref.invalidate(billsProvider);
  }

  String _tableAndCustomer(Bill bill) {
    final table = bill.order['table'] as Map<String, dynamic>?;
    final tableName =
        table?['displayName'] as String? ??
        table?['tableNumber'] as String? ??
        'No table';
    return '$tableName - ${bill.customerName ?? 'Walk-in customer'}';
  }

  Widget _total(
    String label,
    int amount,
    String currency, {
    bool bold = false,
  }) => ListTile(
    dense: true,
    title: Text(label),
    trailing: Text(
      _money(currency, amount),
      style: bold ? const TextStyle(fontWeight: FontWeight.bold) : null,
    ),
  );

  String _money(String currency, int amount) =>
      '$currency ${(amount / 100).toStringAsFixed(2)}';
}
