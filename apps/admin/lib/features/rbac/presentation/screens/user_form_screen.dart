import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/rbac_providers.dart';

class UserFormScreen extends ConsumerStatefulWidget {
  const UserFormScreen({this.user, super.key});
  final AppUser? user;
  @override
  ConsumerState<UserFormScreen> createState() => _UserFormScreenState();
}

class _UserFormScreenState extends ConsumerState<UserFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  final _password = TextEditingController();
  final _selectedRoles = <String>{};
  final _selectedOutlets = <String>{};
  bool _invite = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.user?.name);
    _email = TextEditingController(text: widget.user?.email);
    _phone = TextEditingController(text: widget.user?.phone);
  }

  @override
  Widget build(BuildContext context) {
    final roles = ref.watch(rolesProvider);
    final outlets = ref.watch(rbacOutletsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.user == null ? 'Add User' : 'Edit User'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _field(_name, 'Name'),
            _field(
              _email,
              'Email',
              enabled: widget.user == null,
              validator: (value) => value != null && value.contains('@')
                  ? null
                  : 'Valid email required',
            ),
            _field(_phone, 'Phone', required: false),
            if (widget.user == null) ...[
              SwitchListTile(
                title: const Text('Invite without password'),
                value: _invite,
                onChanged: (value) => setState(() => _invite = value),
              ),
              if (!_invite)
                _field(
                  _password,
                  'Initial password',
                  validator: (value) =>
                      (value?.length ?? 0) >= 8 ? null : 'Minimum 8 characters',
                ),
              const Text('Roles'),
              roles.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text('$error'),
                data: (page) => Column(
                  children: page.data
                      .map(
                        (role) => CheckboxListTile(
                          value: _selectedRoles.contains(role.id),
                          title: Text(role.name),
                          subtitle: Text(role.code),
                          onChanged: (checked) => setState(
                            () => checked ?? false
                                ? _selectedRoles.add(role.id)
                                : _selectedRoles.remove(role.id),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
              const Text('Outlet access'),
              outlets.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text('$error'),
                data: (items) => Column(
                  children: items
                      .map(
                        (outlet) => CheckboxListTile(
                          value: _selectedOutlets.contains(outlet.id),
                          title: Text(outlet.name),
                          onChanged: (checked) => setState(
                            () => checked ?? false
                                ? _selectedOutlets.add(outlet.id)
                                : _selectedOutlets.remove(outlet.id),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Saving...' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    bool required = true,
    bool enabled = true,
    String? Function(String?)? validator,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: controller,
      enabled: enabled,
      obscureText: label.toLowerCase().contains('password'),
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
    if (widget.user == null && _selectedRoles.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Select at least one role')));
      return;
    }
    setState(() => _saving = true);
    try {
      final repository = ref.read(rbacRepositoryProvider);
      final payload = <String, dynamic>{
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        if (_phone.text.trim().isNotEmpty) 'phone': _phone.text.trim(),
        if (widget.user == null) 'roleIds': _selectedRoles.toList(),
        if (widget.user == null) 'outletIds': _selectedOutlets.toList(),
        if (widget.user == null && !_invite) 'password': _password.text,
      };
      if (widget.user == null) {
        if (_invite) {
          await repository.inviteUser(payload);
        } else {
          await repository.createUser(payload);
        }
      } else {
        await repository.updateUser(widget.user!.id, payload);
      }
      ref.invalidate(usersProvider);
      ref.invalidate(userManagementMetricsProvider);
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
