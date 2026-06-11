import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/table_query.dart';
import '../providers/table_providers.dart';

class TableFormScreen extends ConsumerStatefulWidget {
  const TableFormScreen({super.key, this.table});
  final DiningTable? table;

  @override
  ConsumerState<TableFormScreen> createState() => _TableFormScreenState();
}

class _TableFormScreenState extends ConsumerState<TableFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _number = TextEditingController(text: widget.table?.tableNumber);
  late final _name = TextEditingController(text: widget.table?.displayName);
  late final _capacity = TextEditingController(
    text: widget.table?.capacity.toString() ?? '2',
  );
  String? _sectionId;
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    final outletId = ref.watch(activeOutletIdProvider);
    final query = TableQuery(outletId: outletId);
    final sections = ref.watch(tableSectionsProvider(query));
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.table == null ? 'Add Table' : 'Edit Table'),
      ),
      body: Center(
        child: SizedBox(
          width: 560,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: ListView(
                children: <Widget>[
                  sections.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (error, stack) => Text(error.toString()),
                    data: (response) => DropdownButtonFormField<String>(
                      initialValue: _sectionId ?? widget.table?.sectionId,
                      decoration: const InputDecoration(labelText: 'Section'),
                      items: response.data
                          .map(
                            (section) => DropdownMenuItem<String>(
                              value: section.id,
                              child: Text(section.name),
                            ),
                          )
                          .toList(),
                      onChanged: (value) => _sectionId = value,
                      validator: (value) =>
                          value == null ? 'Select a section' : null,
                    ),
                  ),
                  TextFormField(
                    controller: _number,
                    decoration: const InputDecoration(
                      labelText: 'Table number',
                    ),
                    validator: _required,
                  ),
                  TextFormField(
                    controller: _name,
                    decoration: const InputDecoration(
                      labelText: 'Display name',
                    ),
                  ),
                  TextFormField(
                    controller: _capacity,
                    decoration: const InputDecoration(labelText: 'Capacity'),
                    keyboardType: TextInputType.number,
                    validator: (value) => (int.tryParse(value ?? '') ?? 0) < 1
                        ? 'Enter a valid capacity'
                        : null,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _saving ? null : () => _save(outletId, query),
                    child: Text(_saving ? 'Saving...' : 'Save'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'Required' : null;

  Future<void> _save(String outletId, TableQuery query) async {
    if (!_formKey.currentState!.validate()) return;
    if (outletId.isEmpty && widget.table == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Set OUTLET_ID to create tables.')),
      );
      return;
    }
    setState(() => _saving = true);
    await ref
        .read(tablesRepositoryProvider)
        .saveTable(
          id: widget.table?.id,
          payload: <String, dynamic>{
            if (widget.table == null) 'outletId': outletId,
            'sectionId': _sectionId ?? widget.table?.sectionId,
            'tableNumber': _number.text.trim(),
            'displayName': _name.text.trim().isEmpty ? null : _name.text.trim(),
            'capacity': int.parse(_capacity.text),
          },
        );
    ref.invalidate(diningTablesProvider(query));
    if (mounted) Navigator.of(context).pop();
  }
}
