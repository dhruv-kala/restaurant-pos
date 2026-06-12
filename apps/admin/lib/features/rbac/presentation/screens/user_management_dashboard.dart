import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/rbac_providers.dart';
import 'add_role_screen.dart';
import 'add_user_screen.dart';
import 'permission_matrix_screen.dart';
import 'role_management_screen.dart';
import 'user_list_screen.dart';

class UserManagementDashboard extends ConsumerWidget {
  const UserManagementDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metrics = ref.watch(userManagementMetricsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Users & Access')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          metrics.when(
            loading: () => const LinearProgressIndicator(),
            error: (error, _) => Text('$error'),
            data: (data) => Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _Metric('Total Users', data.totalUsers),
                _Metric('Active', data.activeUsers),
                _Metric('Inactive', data.inactiveUsers),
                _Metric('Invited', data.invitedUsers),
              ],
            ),
          ),
          const SizedBox(height: 24),
          for (final action in <(String, IconData, Widget)>[
            ('User Directory', Icons.people, const UserListScreen()),
            ('Add User', Icons.person_add, const AddUserScreen()),
            ('Roles', Icons.admin_panel_settings, const RoleManagementScreen()),
            ('Add Role', Icons.add_moderator, const AddRoleScreen()),
            (
              'Permission Matrix',
              Icons.grid_view,
              const PermissionMatrixScreen(),
            ),
          ])
            ListTile(
              leading: Icon(action.$2),
              title: Text(action.$1),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(
                context,
              ).push(MaterialPageRoute<void>(builder: (_) => action.$3)),
            ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);
  final String label;
  final int value;
  @override
  Widget build(BuildContext context) => Card(
    child: SizedBox(
      width: 150,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text('$value', style: Theme.of(context).textTheme.headlineSmall),
            Text(label),
          ],
        ),
      ),
    ),
  );
}
