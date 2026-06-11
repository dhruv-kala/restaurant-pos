import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/table_query.dart';
import '../providers/reservation_providers.dart';
import '../providers/table_providers.dart';

class ReservationFormScreen extends ConsumerStatefulWidget {
  const ReservationFormScreen({super.key, this.reservation});
  final TableReservation? reservation;

  @override
  ConsumerState<ReservationFormScreen> createState() =>
      _ReservationFormScreenState();
}

class _ReservationFormScreenState extends ConsumerState<ReservationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(
    text: widget.reservation?.customerName,
  );
  late final _phone = TextEditingController(
    text: widget.reservation?.customerPhone,
  );
  late final _guests = TextEditingController(
    text: widget.reservation?.guestCount.toString() ?? '2',
  );
  String? _tableId;
  DateTime _date = DateTime.now().add(const Duration(hours: 1));

  @override
  Widget build(BuildContext context) {
    final outletId = ref.watch(activeOutletIdProvider);
    final tableQuery = TableQuery(outletId: outletId);
    final tables = ref.watch(diningTablesProvider(tableQuery));
    return Scaffold(
      appBar: AppBar(title: const Text('Reservation')),
      body: Center(
        child: SizedBox(
          width: 560,
          child: Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: <Widget>[
                tables.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (error, stack) => Text(error.toString()),
                  data: (response) => DropdownButtonFormField<String>(
                    initialValue: widget.reservation?.tableId,
                    decoration: const InputDecoration(labelText: 'Table'),
                    items: response.data
                        .map(
                          (table) => DropdownMenuItem<String>(
                            value: table.id,
                            child: Text(table.displayName ?? table.tableNumber),
                          ),
                        )
                        .toList(),
                    onChanged: (value) => _tableId = value,
                    validator: (value) =>
                        value == null ? 'Select a table' : null,
                  ),
                ),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Customer name'),
                  validator: _required,
                ),
                TextFormField(
                  controller: _phone,
                  decoration: const InputDecoration(labelText: 'Phone'),
                  validator: _required,
                ),
                TextFormField(
                  controller: _guests,
                  decoration: const InputDecoration(labelText: 'Guests'),
                  keyboardType: TextInputType.number,
                ),
                ListTile(
                  title: const Text('Reservation time'),
                  subtitle: Text(_date.toLocal().toString()),
                  trailing: const Icon(Icons.schedule),
                  onTap: _pickDateTime,
                ),
                FilledButton(
                  onPressed: () => _save(outletId),
                  child: const Text('Save'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'Required' : null;

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _date,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_date),
    );
    if (time != null) {
      setState(
        () => _date = DateTime(
          date.year,
          date.month,
          date.day,
          time.hour,
          time.minute,
        ),
      );
    }
  }

  Future<void> _save(String outletId) async {
    if (!_formKey.currentState!.validate()) return;
    await ref
        .read(tablesRepositoryProvider)
        .saveReservation(
          id: widget.reservation?.id,
          payload: <String, dynamic>{
            if (widget.reservation == null) 'outletId': outletId,
            'tableId': _tableId ?? widget.reservation?.tableId,
            'customerName': _name.text.trim(),
            'customerPhone': _phone.text.trim(),
            'guestCount': int.parse(_guests.text),
            'reservationDate': _date.toUtc().toIso8601String(),
          },
        );
    ref.invalidate(reservationsProvider);
    if (mounted) Navigator.pop(context);
  }
}
