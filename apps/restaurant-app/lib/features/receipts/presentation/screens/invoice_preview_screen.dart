import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../providers/receipts_providers.dart';

class InvoicePreviewScreen extends ConsumerWidget {
  const InvoicePreviewScreen({required this.receiptId, super.key});
  final String receiptId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(receiptProvider(receiptId));
    return Scaffold(
      appBar: AppBar(title: const Text('Invoice Preview')),
      body: value.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to preview invoice',
          message: error.toString(),
        ),
        data: (receipt) => Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Card(
              margin: const EdgeInsets.all(20),
              child: ListView(
                padding: const EdgeInsets.all(28),
                children: <Widget>[
                  Text(
                    receipt.outlet['name'] as String,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  Text(
                    receipt.outlet['address'] as String? ?? '',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    receipt.invoiceNumber ?? receipt.receiptNumber,
                    textAlign: TextAlign.center,
                  ),
                  const Divider(height: 32),
                  ...receipt.items.map(
                    (item) => ListTile(
                      dense: true,
                      title: Text(item.name),
                      leading: Text('${item.quantity}'),
                      trailing: Text('${item.lineTotal}'),
                    ),
                  ),
                  const Divider(),
                  Text(
                    'Total: ${receipt.summary['grandTotal']}',
                    textAlign: TextAlign.right,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 24),
                  const Icon(Icons.qr_code_2, size: 96),
                  Text(receipt.qrPayload, textAlign: TextAlign.center),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: () => context.push(
                      '${AppRoutes.receipts}/${receipt.id}/print',
                    ),
                    icon: const Icon(Icons.print),
                    label: const Text('Print'),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.tonalIcon(
                    onPressed: () async {
                      final bytes = await ref
                          .read(receiptsRepositoryProvider)
                          .pdf(receipt.id);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Downloaded ${bytes.length} PDF bytes',
                            ),
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.download),
                    label: const Text('Download PDF'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
