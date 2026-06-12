import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/rbac_providers.dart';

class RoleFormScreen extends ConsumerStatefulWidget {
  const RoleFormScreen({this.role, super.key});
  final Role? role;
  @override
  ConsumerState<RoleFormScreen> createState() => _RoleFormScreenState();
}

class _RoleFormScreenState extends ConsumerState<RoleFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _code;
  late final TextEditingController _description;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.role?.name);
    _code = TextEditingController(text: widget.role?.code);
    _description = TextEditingController(text: widget.role?.description);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.role == null ? 'Add Role' : 'Edit Role')),
    body: Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _field(_name, 'Role name'),
          _field(
            _code,
            'Role code',
            validator: (value) =>
                RegExp(r'^[A-Z][A-Z0-9_]+$').hasMatch(value ?? '')
                ? null
                : 'Use uppercase letters, numbers, and underscores',
          ),
          _field(_description, 'Description', required: false, maxLines: 3),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Saving...' : 'Save'),
          ),
        ],
      ),
    ),
  );

  Widget _field(
    TextEditingController controller,
    String label, {
    bool required = true,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: controller,
      maxLines: maxLines,
      decoration: InputDecoration(labelText: label),
      validator:
          validator ??
          (required
              ? (value) =>
                    value == null || value.trim().isEmpty ? 'Required' : null
              : null),
    ),
  );

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{
        'name': _name.text.trim(),
        'code': _code.text.trim().toUpperCase(),
        if (_description.text.trim().isNotEmpty)
          'description': _description.text.trim(),
      };
      final repository = ref.read(rbacRepositoryProvider);
      if (widget.role == null) {
        await repository.createRole(payload);
      } else {
        await repository.updateRole(widget.role!.id, payload);
      }
      ref.invalidate(rolesProvider);
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
