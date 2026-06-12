import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/rbac_providers.dart';

class AssignUserRolesScreen extends ConsumerStatefulWidget {
  const AssignUserRolesScreen({required this.user, super.key});
  final AppUser user;
  @override
  ConsumerState<AssignUserRolesScreen> createState() =>
      _AssignUserRolesScreenState();
}

class _AssignUserRolesScreenState extends ConsumerState<AssignUserRolesScreen> {
  late final Set<String> _selected;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.user.roles.map((role) => role.id).toSet();
  }

  @override
  Widget build(BuildContext context) {
    final roles = ref.watch(rolesProvider);
    return Scaffold(
      appBar: AppBar(title: Text('${widget.user.name} Roles')),
      body: roles.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (page) => ListView(
          children: page.data
              .map(
                (role) => CheckboxListTile(
                  value: _selected.contains(role.id),
                  title: Text(role.name),
                  subtitle: Text(role.code),
                  onChanged: (checked) => setState(
                    () => checked ?? false
                        ? _selected.add(role.id)
                        : _selected.remove(role.id),
                  ),
                ),
              )
              .toList(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _saving || _selected.isEmpty ? null : _save,
        icon: const Icon(Icons.save),
        label: const Text('Save'),
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref
          .read(rbacRepositoryProvider)
          .assignUserRoles(widget.user.id, _selected.toList());
      ref.invalidate(userDetailsProvider(widget.user.id));
      ref.invalidate(userAccessProvider(widget.user.id));
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
