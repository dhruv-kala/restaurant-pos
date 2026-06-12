import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/inventory_query.dart';
import '../providers/inventory_providers.dart';

class VendorManagementScreen extends ConsumerWidget {
  const VendorManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = InventoryQuery();
    final vendors = ref.watch(vendorProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Vendors')),
      body: vendors.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(error.toString())),
        data: (page) => ListView.builder(
          itemCount: page.data.length,
          itemBuilder: (context, index) {
            final vendor = page.data[index];
            return ListTile(
              leading: const Icon(Icons.local_shipping),
              title: Text(vendor.name),
              subtitle: Text(
                vendor.contactPerson ?? vendor.phone ?? 'No contact',
              ),
              trailing: Text(vendor.isActive ? 'Active' : 'Inactive'),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _create(context, ref, query),
        icon: const Icon(Icons.add),
        label: const Text('Vendor'),
      ),
    );
  }

  Future<void> _create(
    BuildContext context,
    WidgetRef ref,
    InventoryQuery query,
  ) async {
    final name = TextEditingController();
    final phone = TextEditingController();
    final contact = TextEditingController();
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Vendor'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            TextField(
              controller: contact,
              decoration: const InputDecoration(labelText: 'Contact person'),
            ),
            TextField(
              controller: phone,
              decoration: const InputDecoration(labelText: 'Phone'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    if (accepted != true || name.text.trim().isEmpty) return;
    await ref.read(inventoryRepositoryProvider).createVendor({
      'name': name.text.trim(),
      if (contact.text.trim().isNotEmpty) 'contactPerson': contact.text.trim(),
      if (phone.text.trim().isNotEmpty) 'phone': phone.text.trim(),
    });
    ref.invalidate(vendorProvider(query));
  }
}
