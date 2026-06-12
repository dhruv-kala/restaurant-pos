import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

final customerLookupApiProvider = Provider<CustomersApiService>(
  (ref) => CustomersApiService(ref.watch(dioProvider)),
);

class CustomerLookupWidget extends ConsumerStatefulWidget {
  const CustomerLookupWidget({
    required this.onSelected,
    super.key,
    this.required = false,
  });
  final ValueChanged<Customer?> onSelected;
  final bool required;

  @override
  ConsumerState<CustomerLookupWidget> createState() =>
      _CustomerLookupWidgetState();
}

class _CustomerLookupWidgetState extends ConsumerState<CustomerLookupWidget> {
  final search = TextEditingController();
  List<Customer> results = const [];
  Customer? selected;
  bool loading = false;

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      TextField(
        controller: search,
        decoration: InputDecoration(
          labelText: widget.required
              ? 'Customer phone or name (required)'
              : 'Customer phone or name',
          prefixIcon: const Icon(Icons.person_search),
          suffixIcon: IconButton(
            onPressed: _lookup,
            icon: const Icon(Icons.search),
          ),
        ),
        onSubmitted: (_) => _lookup(),
      ),
      if (loading) const LinearProgressIndicator(),
      if (selected != null)
        ListTile(
          title: Text(selected!.displayName),
          subtitle: Text(selected!.phone ?? selected!.email ?? ''),
          trailing: IconButton(
            onPressed: () {
              setState(() => selected = null);
              widget.onSelected(null);
            },
            icon: const Icon(Icons.close),
          ),
        )
      else
        for (final customer in results)
          ListTile(
            title: Text(customer.displayName),
            subtitle: Text(customer.phone ?? customer.email ?? ''),
            onTap: () {
              setState(() {
                selected = customer;
                results = const [];
              });
              widget.onSelected(customer);
            },
          ),
    ],
  );

  Future<void> _lookup() async {
    if (search.text.trim().isEmpty) return;
    setState(() => loading = true);
    try {
      final page = await ref
          .read(customerLookupApiProvider)
          .searchCustomers(search.text.trim());
      if (mounted) setState(() => results = page.data);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }
}
