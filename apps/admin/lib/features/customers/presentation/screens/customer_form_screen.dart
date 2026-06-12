import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import '../providers/customers_providers.dart';

class CustomerFormScreen extends ConsumerStatefulWidget {
  const CustomerFormScreen({super.key, this.customerId});
  final String? customerId;
  @override
  ConsumerState<CustomerFormScreen> createState() => _CustomerFormScreenState();
}

class _CustomerFormScreenState extends ConsumerState<CustomerFormScreen> {
  final firstName = TextEditingController();
  final lastName = TextEditingController();
  final phone = TextEditingController();
  final email = TextEditingController();
  final notes = TextEditingController();
  CustomerType type = CustomerType.walkIn;
  bool sms = false;
  bool emailOptIn = false;
  bool whatsapp = false;
  String? loaded;

  @override
  void dispose() {
    firstName.dispose();
    lastName.dispose();
    phone.dispose();
    email.dispose();
    notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.customerId case final id?) {
      ref.watch(customerDetailsProvider(id)).whenData((customer) {
        if (loaded == id) return;
        loaded = id;
        firstName.text = customer.firstName ?? '';
        lastName.text = customer.lastName ?? '';
        phone.text = customer.phone ?? '';
        email.text = customer.email ?? '';
        notes.text = customer.notes ?? '';
        type = customer.customerType;
        sms = customer.smsOptIn;
        emailOptIn = customer.emailOptIn;
        whatsapp = customer.whatsappOptIn;
      });
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.customerId == null ? 'Add customer' : 'Edit customer',
        ),
        actions: [TextButton(onPressed: _save, child: const Text('Save'))],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: firstName,
            decoration: const InputDecoration(labelText: 'First name'),
          ),
          TextField(
            controller: lastName,
            decoration: const InputDecoration(labelText: 'Last name'),
          ),
          TextField(
            controller: phone,
            decoration: const InputDecoration(labelText: 'Phone'),
          ),
          TextField(
            controller: email,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          DropdownButtonFormField<CustomerType>(
            initialValue: type,
            decoration: const InputDecoration(labelText: 'Customer type'),
            items: CustomerType.values
                .map(
                  (value) =>
                      DropdownMenuItem(value: value, child: Text(value.name)),
                )
                .toList(),
            onChanged: (value) => setState(() => type = value ?? type),
          ),
          TextField(
            controller: notes,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Notes'),
          ),
          SwitchListTile(
            value: sms,
            onChanged: (value) => setState(() => sms = value),
            title: const Text('SMS opt-in'),
          ),
          SwitchListTile(
            value: emailOptIn,
            onChanged: (value) => setState(() => emailOptIn = value),
            title: const Text('Email opt-in'),
          ),
          SwitchListTile(
            value: whatsapp,
            onChanged: (value) => setState(() => whatsapp = value),
            title: const Text('WhatsApp opt-in'),
          ),
        ],
      ),
    );
  }

  Future<void> _save() async {
    final payload = {
      if (firstName.text.trim().isNotEmpty) 'firstName': firstName.text.trim(),
      if (lastName.text.trim().isNotEmpty) 'lastName': lastName.text.trim(),
      if (phone.text.trim().isNotEmpty) 'phone': phone.text.trim(),
      if (email.text.trim().isNotEmpty) 'email': email.text.trim(),
      if (notes.text.trim().isNotEmpty) 'notes': notes.text.trim(),
      'customerType': type.wireName,
      'smsOptIn': sms,
      'emailOptIn': emailOptIn,
      'whatsappOptIn': whatsapp,
    };
    final repo = ref.read(customersRepositoryProvider);
    if (widget.customerId == null) {
      await repo.create(payload);
    } else {
      await repo.update(widget.customerId!, payload);
    }
    if (mounted) Navigator.of(context).pop();
  }
}
