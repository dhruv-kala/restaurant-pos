import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/rbac_providers.dart';

class AssignRolePermissionsScreen extends ConsumerStatefulWidget {
  const AssignRolePermissionsScreen({required this.role, super.key});
  final Role role;
  @override
  ConsumerState<AssignRolePermissionsScreen> createState() =>
      _AssignRolePermissionsScreenState();
}

class _AssignRolePermissionsScreenState
    extends ConsumerState<AssignRolePermissionsScreen> {
  final _selected = <String>{};
  bool _initialized = false;
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    final groups = ref.watch(permissionGroupsProvider);
    final assigned = ref.watch(rolePermissionsProvider(widget.role.id));
    if (!_initialized && assigned.hasValue) {
      _selected.addAll(assigned.value!.map((permission) => permission.id));
      _initialized = true;
    }
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.role.name} Permissions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _saving ? null : _save,
          ),
        ],
      ),
      body: widget.role.isSystemRole
          ? const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'System role mappings are read-only for tenant administrators.',
              ),
            )
          : groups.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
              data: (items) => ListView(
                children: items
                    .map(
                      (group) => ExpansionTile(
                        title: Text(group.module),
                        children: group.permissions
                            .map(
                              (permission) => CheckboxListTile(
                                value: _selected.contains(permission.id),
                                title: Text(permission.action.toUpperCase()),
                                subtitle: Text(permission.description),
                                onChanged: (checked) => setState(
                                  () => checked ?? false
                                      ? _selected.add(permission.id)
                                      : _selected.remove(permission.id),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    )
                    .toList(),
              ),
            ),
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref
          .read(rbacRepositoryProvider)
          .assignRolePermissions(widget.role.id, _selected.toList());
      ref.invalidate(rolePermissionsProvider(widget.role.id));
      ref.invalidate(rolesProvider);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Permissions updated')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
