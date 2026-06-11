import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/payments_providers.dart';

class SplitPaymentScreen extends ConsumerStatefulWidget {
  const SplitPaymentScreen({required this.billId, super.key});
  final String billId;

  @override
  ConsumerState<SplitPaymentScreen> createState() => _SplitPaymentScreenState();
}

class _SplitPaymentScreenState extends ConsumerState<SplitPaymentScreen> {
  PaymentMethod firstMethod = PaymentMethod.cash;
  PaymentMethod secondMethod = PaymentMethod.upi;
  final firstAmount = TextEditingController();
  final secondAmount = TextEditingController();
  final firstReference = TextEditingController();
  final secondReference = TextEditingController();
  bool submitting = false;

  @override
  void dispose() {
    firstAmount.dispose();
    secondAmount.dispose();
    firstReference.dispose();
    secondReference.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(paymentBillProvider(widget.billId));
    return Scaffold(
      appBar: AppBar(title: const Text('Split Payment')),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load bill',
          message: error.toString(),
        ),
        data: (bill) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            Text('${bill.billNumber} - ${bill.outstandingAmount} minor units'),
            _tender(
              method: firstMethod,
              amount: firstAmount,
              reference: firstReference,
              onMethod: (value) => setState(() => firstMethod = value),
            ),
            const Divider(),
            _tender(
              method: secondMethod,
              amount: secondAmount,
              reference: secondReference,
              onMethod: (value) => setState(() => secondMethod = value),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: submitting ? null : () => _submit(bill),
              child: Text(
                submitting ? 'Processing...' : 'Confirm Split Payment',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tender({
    required PaymentMethod method,
    required TextEditingController amount,
    required TextEditingController reference,
    required ValueChanged<PaymentMethod> onMethod,
  }) => Column(
    children: <Widget>[
      DropdownButtonFormField<PaymentMethod>(
        initialValue: method,
        items: PaymentMethod.values
            .map(
              (item) =>
                  DropdownMenuItem(value: item, child: Text(item.wireName)),
            )
            .toList(),
        onChanged: (value) => onMethod(value!),
      ),
      TextField(
        controller: amount,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(labelText: 'Amount (minor units)'),
      ),
      TextField(
        controller: reference,
        decoration: InputDecoration(
          labelText: method == PaymentMethod.cash
              ? 'Cash received (minor units)'
              : method == PaymentMethod.card
              ? 'Reference / card last 4'
              : 'Reference number',
        ),
      ),
    ],
  );

  Map<String, dynamic> _data(
    PaymentMethod method,
    TextEditingController amount,
    TextEditingController reference,
  ) {
    final amountValue = int.parse(amount.text);
    return <String, dynamic>{
      'paymentMethod': method.wireName,
      'amount': amountValue,
      if (method == PaymentMethod.cash)
        'cashReceived': int.parse(reference.text),
      if (method != PaymentMethod.cash)
        'referenceNumber': reference.text.trim(),
      if (method == PaymentMethod.upi)
        'upiTransactionId': reference.text.trim(),
      if (method == PaymentMethod.card) 'cardLast4': reference.text.trim(),
    };
  }

  Future<void> _submit(Bill bill) async {
    setState(() => submitting = true);
    try {
      final payment = await ref.read(paymentsRepositoryProvider).split(
        <String, dynamic>{
          'billId': bill.id,
          'idempotencyKey': PaymentsApiService.idempotencyKey('split-payment'),
          'payments': <Map<String, dynamic>>[
            _data(firstMethod, firstAmount, firstReference),
            _data(secondMethod, secondAmount, secondReference),
          ],
        },
      );
      ref.invalidate(paymentsListProvider);
      ref.invalidate(paymentBillProvider(bill.id));
      if (mounted) context.go('${AppRoutes.payments}/${payment.id}');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }
}
