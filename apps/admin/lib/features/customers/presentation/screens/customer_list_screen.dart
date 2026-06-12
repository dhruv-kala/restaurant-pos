import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/customer_query.dart';
import '../providers/customers_providers.dart';
import 'add_customer_screen.dart';
import 'customer_details_screen.dart';

class CustomerListScreen extends ConsumerStatefulWidget {
  const CustomerListScreen({super.key});
  @override
  ConsumerState<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends ConsumerState<CustomerListScreen> {
  String _search = '';
  @override
  Widget build(BuildContext context) {
    final query = CustomerQuery(search: _search);
    final customers = ref.watch(customerListProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Customer directory')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context)
            .push(
              MaterialPageRoute<void>(
                builder: (_) => const AddCustomerScreen(),
              ),
            )
            .then((_) => ref.invalidate(customerListProvider(query))),
        icon: const Icon(Icons.person_add),
        label: const Text('Customer'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                labelText: 'Search phone, email, or name',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (value) => setState(() => _search = value.trim()),
            ),
          ),
          Expanded(
            child: customers.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
              data: (page) => ListView.builder(
                itemCount: page.data.length,
                itemBuilder: (context, index) {
                  final customer = page.data[index];
                  return ListTile(
                    leading: CircleAvatar(
                      child: Text(
                        customer.displayName.substring(0, 1).toUpperCase(),
                      ),
                    ),
                    title: Text(customer.displayName),
                    subtitle: Text(
                      customer.phone ??
                          customer.email ??
                          customer.customerType.name,
                    ),
                    trailing: Text(customer.status.name),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => CustomerDetailsScreen(id: customer.id),
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
