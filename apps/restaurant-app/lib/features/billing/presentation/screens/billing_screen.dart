import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/router/app_router.dart';
import '../providers/billing_providers.dart';

class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({required this.orderId, super.key});
  final String orderId;

  @override
  ConsumerState<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends ConsumerState<BillingScreen> {
  final customerName = TextEditingController();
  final customerPhone = TextEditingController();
  final gstNumber = TextEditingController();
  bool submitting = false;
  bool interstate = false;

  @override
  void dispose() {
    customerName.dispose();
    customerPhone.dispose();
    gstNumber.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Generate Bill')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: <Widget>[
        Text('Order ${widget.orderId}'),
        const SizedBox(height: 16),
        TextField(
          controller: customerName,
          decoration: const InputDecoration(labelText: 'Customer name'),
        ),
        TextField(
          controller: customerPhone,
          decoration: const InputDecoration(labelText: 'Customer phone'),
        ),
        TextField(
          controller: gstNumber,
          decoration: const InputDecoration(labelText: 'Customer GST number'),
        ),
        SwitchListTile(
          value: interstate,
          title: const Text('Interstate supply (IGST)'),
          onChanged: (value) => setState(() => interstate = value),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: submitting ? null : _generate,
          child: Text(submitting ? 'Generating...' : 'Generate Bill'),
        ),
      ],
    ),
  );

  Future<void> _generate() async {
    setState(() => submitting = true);
    try {
      final bill = await ref
          .read(billingRepositoryProvider)
          .generate(widget.orderId, <String, dynamic>{
            'gstMode': interstate ? 'IGST' : 'CGST_SGST',
            if (customerName.text.trim().isNotEmpty)
              'customerName': customerName.text.trim(),
            if (customerPhone.text.trim().isNotEmpty)
              'customerPhone': customerPhone.text.trim(),
            if (gstNumber.text.trim().isNotEmpty)
              'customerGSTNumber': gstNumber.text.trim(),
          });
      ref.invalidate(billsProvider);
      if (mounted) context.go('${AppRoutes.billing}/${bill.id}');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }
}
