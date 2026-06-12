import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../providers/customers_providers.dart';

class CustomerNotesScreen extends ConsumerStatefulWidget {
  const CustomerNotesScreen({required this.customerId, super.key});
  final String customerId;
  @override
  ConsumerState<CustomerNotesScreen> createState() =>
      _CustomerNotesScreenState();
}

class _CustomerNotesScreenState extends ConsumerState<CustomerNotesScreen> {
  final note = TextEditingController();
  @override
  void dispose() {
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Customer notes')),
    body: FutureBuilder<List<CustomerNote>>(
      future: ref.read(customersRepositoryProvider).notes(widget.customerId),
      builder: (context, snapshot) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final item in snapshot.data ?? const <CustomerNote>[])
            ListTile(
              title: Text(item.note),
              subtitle: Text(
                item.createdByName ?? item.createdAt.toLocal().toString(),
              ),
            ),
          TextField(
            controller: note,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Operational note'),
          ),
          FilledButton(onPressed: _add, child: const Text('Add note')),
        ],
      ),
    ),
  );
  Future<void> _add() async {
    if (note.text.trim().isEmpty) return;
    await ref
        .read(customersApiProvider)
        .createCustomerNote(widget.customerId, note.text.trim());
    if (mounted) setState(() => note.clear());
  }
}
