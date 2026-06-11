import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/payments_providers.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({required this.billId, super.key});
  final String billId;

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  PaymentMethod method = PaymentMethod.cash;
  final amount = TextEditingController();
  final cashReceived = TextEditingController();
  final reference = TextEditingController();
  final cardLast4 = TextEditingController();
  bool submitting = false;

  @override
  void dispose() {
    amount.dispose();
    cashReceived.dispose();
    reference.dispose();
    cardLast4.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(paymentBillProvider(widget.billId));
    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load bill',
          message: error.toString(),
        ),
        data: (bill) {
          if (amount.text.isEmpty) {
            amount.text = bill.outstandingAmount.toString();
          }
          final amountValue = int.tryParse(amount.text) ?? 0;
          final received = int.tryParse(cashReceived.text) ?? 0;
          return ListView(
            padding: const EdgeInsets.all(20),
            children: <Widget>[
              Text(
                bill.billNumber,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              Text(
                'Outstanding: ${_money(bill.currencyCode, bill.outstandingAmount)}',
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<PaymentMethod>(
                initialValue: method,
                decoration: const InputDecoration(labelText: 'Payment method'),
                items: PaymentMethod.values
                    .map(
                      (item) => DropdownMenuItem(
                        value: item,
                        child: Text(item.wireName),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => method = value!),
              ),
              TextField(
                controller: amount,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Amount (minor units)',
                ),
                onChanged: (_) => setState(() {}),
              ),
              if (method == PaymentMethod.cash) ...<Widget>[
                TextField(
                  controller: cashReceived,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Cash received (minor units)',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                Text(
                  'Change returned: ${_money(bill.currencyCode, received - amountValue)}',
                ),
              ],
              if (method != PaymentMethod.cash)
                TextField(
                  controller: reference,
                  decoration: const InputDecoration(
                    labelText: 'Reference number',
                  ),
                ),
              if (method == PaymentMethod.card)
                TextField(
                  controller: cardLast4,
                  maxLength: 4,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Card last 4'),
                ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: submitting ? null : () => _submit(bill),
                child: Text(submitting ? 'Processing...' : 'Confirm Payment'),
              ),
              TextButton(
                onPressed: () =>
                    context.push('${AppRoutes.payments}/split/${bill.id}'),
                child: const Text('Use split payment'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _submit(Bill bill) async {
    setState(() => submitting = true);
    try {
      final payment = await ref.read(paymentsRepositoryProvider).create(
        <String, dynamic>{
          'billId': bill.id,
          'idempotencyKey': PaymentsApiService.idempotencyKey(),
          'paymentMethod': method.wireName,
          'amount': int.parse(amount.text),
          if (method == PaymentMethod.cash)
            'cashReceived': int.parse(cashReceived.text),
          if (method != PaymentMethod.cash)
            'referenceNumber': reference.text.trim(),
          if (method == PaymentMethod.upi)
            'upiTransactionId': reference.text.trim(),
          if (method == PaymentMethod.card) 'cardLast4': cardLast4.text.trim(),
        },
      );
      ref.invalidate(paymentsListProvider);
      ref.invalidate(paymentBillProvider(bill.id));
      if (mounted) context.go('${AppRoutes.payments}/${payment.id}');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  String _money(String currency, int amount) =>
      '$currency ${(amount / 100).toStringAsFixed(2)}';
}
