import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/payments_providers.dart';
import '../../../receipts/presentation/providers/receipts_providers.dart';

class PaymentDetailsScreen extends ConsumerWidget {
  const PaymentDetailsScreen({required this.paymentId, super.key});
  final String paymentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(paymentDetailsProvider(paymentId));
    final user = ref.watch(authNotifierProvider).user;
    final role = user == null ? null : RoleAccess.primaryRole(user.roles);
    final canRefund = role != UserRole.waiter;
    return Scaffold(
      appBar: AppBar(title: const Text('Payment Details')),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load payment',
          message: error.toString(),
        ),
        data: (payment) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            Text(
              payment.paymentNumber,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            Text('${payment.bill['billNumber']} - ${payment.status.wireName}'),
            Text('Business date: ${payment.businessDate.toLocal()}'),
            const Divider(height: 32),
            ...payment.transactions.map(
              (transaction) => ListTile(
                title: Text(transaction.paymentMethod.wireName),
                subtitle: Text(
                  transaction.referenceNumber ??
                      transaction.upiTransactionId ??
                      transaction.status.wireName,
                ),
                trailing: Text(
                  '${payment.bill['currencyCode']} '
                  '${(transaction.amount / 100).toStringAsFixed(2)}',
                ),
              ),
            ),
            const Divider(),
            ListTile(
              title: const Text('Paid'),
              trailing: Text('${payment.paidAmount} minor units'),
            ),
            ListTile(
              title: const Text('Refunded'),
              trailing: Text('${payment.refundedAmount} minor units'),
            ),
            ...payment.refunds.map(
              (refund) => ListTile(
                title: Text(refund.refundNumber),
                subtitle: Text(refund.refundReason),
                trailing: Text('-${refund.refundAmount}'),
              ),
            ),
            if (canRefund &&
                payment.paidAmount > payment.refundedAmount &&
                payment.status != PaymentStatus.failed)
              FilledButton.tonalIcon(
                onPressed: () =>
                    context.push('${AppRoutes.payments}/${payment.id}/refund'),
                icon: const Icon(Icons.undo),
                label: const Text('Refund Payment'),
              ),
            if (canRefund &&
                payment.status == PaymentStatus.success) ...<Widget>[
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: () async {
                  final receipt = await ref
                      .read(receiptsRepositoryProvider)
                      .generate(payment.billId, ReceiptType.customerReceipt);
                  if (context.mounted) {
                    context.push('${AppRoutes.receipts}/${receipt.id}');
                  }
                },
                icon: const Icon(Icons.receipt),
                label: const Text('Generate Receipt'),
              ),
              const SizedBox(height: 8),
              FilledButton.tonalIcon(
                onPressed: () async {
                  final invoice = await ref
                      .read(receiptsRepositoryProvider)
                      .generate(payment.billId, ReceiptType.taxInvoice);
                  if (context.mounted) {
                    context.push('${AppRoutes.receipts}/${invoice.id}/preview');
                  }
                },
                icon: const Icon(Icons.description),
                label: const Text('Generate Tax Invoice'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
