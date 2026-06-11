import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/orders_providers.dart';

class EditOrderScreen extends ConsumerStatefulWidget {
  const EditOrderScreen({required this.orderId, super.key});
  final String orderId;

  @override
  ConsumerState<EditOrderScreen> createState() => _EditOrderScreenState();
}

class _EditOrderScreenState extends ConsumerState<EditOrderScreen> {
  final _notes = TextEditingController();
  final _guests = TextEditingController(text: '1');
  bool _loaded = false;

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(orderDetailsProvider(widget.orderId));
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Order')),
      body: order.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('$error')),
        data: (value) {
          if (!_loaded) {
            _notes.text = value.notes ?? '';
            _guests.text = value.guestCount.toString();
            _loaded = true;
          }
          return ListView(
            padding: const EdgeInsets.all(24),
            children: <Widget>[
              TextField(
                controller: _guests,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Guest count'),
              ),
              TextField(
                controller: _notes,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Notes'),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  await ref
                      .read(ordersRepositoryProvider)
                      .update(widget.orderId, <String, dynamic>{
                        'guestCount': int.parse(_guests.text),
                        'notes': _notes.text.trim(),
                      });
                  ref.invalidate(orderDetailsProvider(widget.orderId));
                  if (context.mounted) Navigator.pop(context);
                },
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
  }
}
