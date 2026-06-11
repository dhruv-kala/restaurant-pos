import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../services/printer_service.dart';
import '../providers/receipts_providers.dart';

class PrintReceiptScreen extends ConsumerStatefulWidget {
  const PrintReceiptScreen({required this.receiptId, super.key});
  final String receiptId;

  @override
  ConsumerState<PrintReceiptScreen> createState() => _PrintReceiptScreenState();
}

class _PrintReceiptScreenState extends ConsumerState<PrintReceiptScreen> {
  PrinterDevice? selected;
  int copies = 1;
  bool use80mm = false;
  bool busy = false;

  @override
  Widget build(BuildContext context) {
    final receiptValue = ref.watch(receiptProvider(widget.receiptId));
    final printers = ref.watch(printerServiceProvider).getAvailablePrinters();
    return Scaffold(
      appBar: AppBar(title: const Text('Print Receipt')),
      body: receiptValue.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to prepare print',
          message: error.toString(),
        ),
        data: (receipt) => FutureBuilder<List<PrinterDevice>>(
          future: printers,
          builder: (context, snapshot) {
            final devices = snapshot.data ?? const <PrinterDevice>[];
            selected ??= devices.firstOrNull;
            return ListView(
              padding: const EdgeInsets.all(20),
              children: <Widget>[
                DropdownButtonFormField<PrinterDevice>(
                  initialValue: selected,
                  decoration: const InputDecoration(labelText: 'Printer'),
                  items: devices
                      .map(
                        (device) => DropdownMenuItem(
                          value: device,
                          child: Text(device.name),
                        ),
                      )
                      .toList(growable: false),
                  onChanged: (value) => setState(() => selected = value),
                ),
                SwitchListTile(
                  title: const Text('80mm layout'),
                  value: use80mm,
                  onChanged: (value) => setState(() => use80mm = value),
                ),
                DropdownButtonFormField<int>(
                  initialValue: copies,
                  decoration: const InputDecoration(labelText: 'Copies'),
                  items: List<DropdownMenuItem<int>>.generate(
                    5,
                    (index) => DropdownMenuItem(
                      value: index + 1,
                      child: Text('${index + 1}'),
                    ),
                  ),
                  onChanged: (value) => setState(() => copies = value ?? 1),
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: busy || selected == null
                      ? null
                      : () => _print(context, receipt),
                  icon: const Icon(Icons.print),
                  label: Text(busy ? 'Printing...' : 'Print'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _print(BuildContext context, Receipt receipt) async {
    setState(() => busy = true);
    try {
      final printer = ref.read(printerServiceProvider);
      final formatter = ref.read(receiptFormatterProvider);
      final device = selected!;
      await printer.connectPrinter(device);
      await printer.printReceipt(
        use80mm
            ? formatter.generate80mmLayout(receipt)
            : formatter.generate58mmLayout(receipt),
      );
      await ref
          .read(receiptsRepositoryProvider)
          .recordPrint(
            receipt.id,
            device.name,
            use80mm ? PrinterType.thermal80mm : PrinterType.thermal58mm,
            copies,
            receipt.printCount > 0,
          );
      ref.invalidate(receiptProvider(receipt.id));
      await printer.disconnectPrinter();
      if (context.mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }
}
