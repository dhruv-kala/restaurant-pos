import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/customers_providers.dart';

class CustomerAddressScreen extends ConsumerStatefulWidget {
  const CustomerAddressScreen({required this.customerId, super.key});
  final String customerId;
  @override
  ConsumerState<CustomerAddressScreen> createState() =>
      _CustomerAddressScreenState();
}

class _CustomerAddressScreenState extends ConsumerState<CustomerAddressScreen> {
  final line1 = TextEditingController();
  final city = TextEditingController();
  @override
  void dispose() {
    line1.dispose();
    city.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Customer addresses')),
    body: FutureBuilder(
      future: ref
          .read(customersRepositoryProvider)
          .addresses(widget.customerId),
      builder: (context, snapshot) {
        final rows = snapshot.data ?? const [];
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ...rows.map(
              (item) => ListTile(
                title: Text(item.label),
                subtitle: Text(
                  '${item.addressLine1}${item.city == null ? '' : ', ${item.city}'}',
                ),
                trailing: item.isDefault ? const Icon(Icons.star) : null,
              ),
            ),
            TextField(
              controller: line1,
              decoration: const InputDecoration(labelText: 'Address line 1'),
            ),
            TextField(
              controller: city,
              decoration: const InputDecoration(labelText: 'City'),
            ),
            FilledButton(onPressed: _add, child: const Text('Add address')),
          ],
        );
      },
    ),
  );
  Future<void> _add() async {
    if (line1.text.trim().isEmpty) return;
    await ref
        .read(customersApiProvider)
        .createCustomerAddress(widget.customerId, {
          'addressLine1': line1.text.trim(),
          if (city.text.trim().isNotEmpty) 'city': city.text.trim(),
        });
    if (mounted) setState(() => line1.clear());
  }
}
