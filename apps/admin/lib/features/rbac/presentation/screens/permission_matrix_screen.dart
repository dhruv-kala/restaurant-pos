import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/rbac_providers.dart';

class PermissionMatrixScreen extends ConsumerWidget {
  const PermissionMatrixScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groups = ref.watch(permissionGroupsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Permission Matrix')),
      body: groups.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (items) => ListView(
          padding: const EdgeInsets.all(16),
          children: items
              .map(
                (group) => Card(
                  child: ExpansionTile(
                    title: Text(group.module),
                    subtitle: Text('${group.permissions.length} permissions'),
                    children: group.permissions
                        .map(
                          (permission) => ListTile(
                            leading: Icon(_iconFor(permission.action)),
                            title: Text(permission.action.toUpperCase()),
                            subtitle: Text(
                              '${permission.code}\n${permission.description}',
                            ),
                            isThreeLine: true,
                            trailing: Icon(
                              permission.isActive
                                  ? Icons.check_circle
                                  : Icons.block,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              )
              .toList(),
        ),
      ),
    );
  }

  IconData _iconFor(String action) => switch (action) {
    'read' || 'view' => Icons.visibility,
    'create' => Icons.add_circle,
    'update' => Icons.edit,
    'delete' => Icons.delete,
    _ => Icons.settings,
  };
}
