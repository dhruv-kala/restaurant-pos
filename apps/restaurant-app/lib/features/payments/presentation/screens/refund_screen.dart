import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/payments_providers.dart';

class RefundScreen extends ConsumerStatefulWidget {
  const RefundScreen({required this.paymentId, super.key});
  final String paymentId;

  @override
  ConsumerState<RefundScreen> createState() => _RefundScreenState();
}

class _RefundScreenState extends ConsumerState<RefundScreen> {
  final amount = TextEditingController();
  final reason = TextEditingController();
  bool submitting = false;

  @override
  void dispose() {
    amount.dispose();
    reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(paymentDetailsProvider(widget.paymentId));
    return Scaffold(
      appBar: AppBar(title: const Text('Refund Payment')),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load payment',
          message: error.toString(),
        ),
        data: (payment) {
          final available = payment.paidAmount - payment.refundedAmount;
          if (amount.text.isEmpty) amount.text = available.toString();
          return ListView(
            padding: const EdgeInsets.all(20),
            children: <Widget>[
              Text(payment.paymentNumber),
              Text('Refundable: $available minor units'),
              TextField(
                controller: amount,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Refund amount (minor units)',
                ),
              ),
              TextField(
                controller: reason,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Refund reason'),
              ),
              const ListTile(
                leading: Icon(Icons.approval),
                title: Text('Approval workflow'),
                subtitle: Text('Placeholder: refund is completed immediately'),
              ),
              FilledButton(
                onPressed: submitting ? null : () => _submit(payment.id),
                child: Text(submitting ? 'Refunding...' : 'Confirm Refund'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _submit(String paymentId) async {
    setState(() => submitting = true);
    try {
      await ref
          .read(paymentsRepositoryProvider)
          .refund(paymentId, int.parse(amount.text), reason.text.trim());
      ref.invalidate(paymentDetailsProvider(paymentId));
      ref.invalidate(paymentsListProvider);
      if (mounted) context.go('${AppRoutes.payments}/$paymentId');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }
}
