import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/receipts_providers.dart';

class ReceiptScreen extends ConsumerWidget {
  const ReceiptScreen({required this.receiptId, super.key});
  final String receiptId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(receiptProvider(receiptId));
    return Scaffold(
      appBar: AppBar(title: const Text('Receipt')),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load receipt',
          message: error.toString(),
        ),
        data: (receipt) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            Text(
              receipt.invoiceNumber ?? receipt.receiptNumber,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            Text(
              '${receipt.receiptType.wireName} - ${receipt.status.wireName}',
            ),
            Text('Bill ${receipt.bill['number']}'),
            const Divider(height: 32),
            ...receipt.items.map(
              (item) => ListTile(
                title: Text(item.name),
                subtitle: Text('${item.quantity} x ${item.unitPrice}'),
                trailing: Text('${item.lineTotal}'),
              ),
            ),
            ...receipt.taxes.map(
              (tax) => ListTile(
                title: Text('${tax.name} (${tax.rate}%)'),
                trailing: Text('${tax.amount}'),
              ),
            ),
            ListTile(
              title: const Text('Grand total'),
              trailing: Text('${receipt.summary['grandTotal']}'),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () =>
                  context.push('${AppRoutes.receipts}/${receipt.id}/preview'),
              icon: const Icon(Icons.receipt_long),
              label: const Text('Invoice Preview'),
            ),
            const SizedBox(height: 8),
            FilledButton.tonalIcon(
              onPressed: () =>
                  context.push('${AppRoutes.receipts}/${receipt.id}/print'),
              icon: const Icon(Icons.print),
              label: Text(
                receipt.printCount == 0 ? 'Print Receipt' : 'Reprint Receipt',
              ),
            ),
            if (receipt.printLogs.isNotEmpty) ...<Widget>[
              const Divider(height: 32),
              Text(
                'Print audit',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              ...receipt.printLogs.map(
                (log) => ListTile(
                  title: Text(log.printerName),
                  subtitle: Text(
                    '${log.printerType.wireName} - ${log.printedAt.toLocal()}',
                  ),
                  trailing: Text('${log.copies} copies'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
