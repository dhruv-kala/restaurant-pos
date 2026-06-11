import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../../../app/router/app_router.dart';
import '../../domain/receipt_query.dart';
import '../providers/receipts_providers.dart';

class ReceiptHistoryScreen extends ConsumerStatefulWidget {
  const ReceiptHistoryScreen({super.key});

  @override
  ConsumerState<ReceiptHistoryScreen> createState() =>
      _ReceiptHistoryScreenState();
}

class _ReceiptHistoryScreenState extends ConsumerState<ReceiptHistoryScreen> {
  ReceiptType? type;
  ReceiptStatus? status;

  @override
  Widget build(BuildContext context) {
    final query = ReceiptQuery(type: type, status: status);
    final value = ref.watch(receiptsProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Receipt History')),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: DropdownButtonFormField<ReceiptType?>(
                    initialValue: type,
                    decoration: const InputDecoration(labelText: 'Type'),
                    items: <DropdownMenuItem<ReceiptType?>>[
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...ReceiptType.values.map(
                        (value) => DropdownMenuItem(
                          value: value,
                          child: Text(value.wireName),
                        ),
                      ),
                    ],
                    onChanged: (value) => setState(() => type = value),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<ReceiptStatus?>(
                    initialValue: status,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: <DropdownMenuItem<ReceiptStatus?>>[
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...ReceiptStatus.values.map(
                        (value) => DropdownMenuItem(
                          value: value,
                          child: Text(value.wireName),
                        ),
                      ),
                    ],
                    onChanged: (value) => setState(() => status = value),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: value.when(
              loading: () => const AppLoading(),
              error: (error, stack) => AppEmptyState(
                title: 'Unable to load receipts',
                message: error.toString(),
              ),
              data: (response) => response.data.isEmpty
                  ? const AppEmptyState(title: 'No receipts found')
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: response.data.length,
                      itemBuilder: (context, index) {
                        final receipt = response.data[index];
                        return AppCard(
                          child: ListTile(
                            title: Text(
                              receipt.invoiceNumber ?? receipt.receiptNumber,
                            ),
                            subtitle: Text(
                              '${receipt.receiptType.wireName} - '
                              '${receipt.status.wireName}',
                            ),
                            trailing: Text('${receipt.printCount} prints'),
                            onTap: () => context.push(
                              '${AppRoutes.receipts}/${receipt.id}',
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
