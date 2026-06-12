import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/rbac_providers.dart';
import 'add_role_screen.dart';
import 'assign_role_permissions_screen.dart';
import 'edit_role_screen.dart';

class RoleManagementScreen extends ConsumerWidget {
  const RoleManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roles = ref.watch(rolesProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Role Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_moderator),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const AddRoleScreen()),
            ),
          ),
        ],
      ),
      body: roles.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (page) => ListView.builder(
          itemCount: page.data.length,
          itemBuilder: (_, index) {
            final role = page.data[index];
            return ListTile(
              leading: Icon(
                role.isSystemRole ? Icons.verified_user : Icons.shield_outlined,
              ),
              title: Text(role.name),
              subtitle: Text(
                '${role.isSystemRole ? 'System' : 'Custom'} role | '
                '${role.assignedPermissionsCount} permissions | '
                '${role.assignedUsersCount} users',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => AssignRolePermissionsScreen(role: role),
                ),
              ),
              onLongPress: role.isSystemRole
                  ? null
                  : () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => EditRoleScreen(role: role),
                      ),
                    ),
            );
          },
        ),
      ),
    );
  }
}
