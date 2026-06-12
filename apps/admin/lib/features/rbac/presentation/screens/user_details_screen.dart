import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/rbac_providers.dart';
import 'assign_user_roles_screen.dart';
import 'edit_user_screen.dart';
import 'outlet_access_screen.dart';

class UserDetailsScreen extends ConsumerWidget {
  const UserDetailsScreen({required this.userId, super.key});
  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userDetailsProvider(userId));
    return Scaffold(
      appBar: AppBar(title: const Text('User Details')),
      body: user.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (data) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ListTile(title: Text(data.name), subtitle: Text(data.email)),
            ListTile(
              title: const Text('Status'),
              subtitle: Text(data.status.wireName),
            ),
            ListTile(
              title: const Text('Roles'),
              subtitle: Text(data.roles.map((role) => role.name).join(', ')),
            ),
            ListTile(
              title: const Text('Outlets'),
              subtitle: Text(
                data.outlets.map((outlet) => outlet.name).join(', '),
              ),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.edit),
                  label: const Text('Edit'),
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => EditUserScreen(user: data),
                    ),
                  ),
                ),
                OutlinedButton.icon(
                  icon: const Icon(Icons.admin_panel_settings),
                  label: const Text('Assign roles'),
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => AssignUserRolesScreen(user: data),
                    ),
                  ),
                ),
                OutlinedButton.icon(
                  icon: const Icon(Icons.store),
                  label: const Text('Outlet access'),
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => OutletAccessScreen(user: data),
                    ),
                  ),
                ),
                OutlinedButton.icon(
                  icon: const Icon(Icons.password),
                  label: const Text('Reset password'),
                  onPressed: () => _resetPassword(context, ref),
                ),
                PopupMenuButton<UserStatus>(
                  onSelected: (status) => _setStatus(context, ref, status),
                  itemBuilder: (_) => UserStatus.values
                      .where((status) => status != UserStatus.revoked)
                      .map(
                        (status) => PopupMenuItem(
                          value: status,
                          child: Text(status.wireName),
                        ),
                      )
                      .toList(),
                  child: const Chip(label: Text('Change status')),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _resetPassword(BuildContext context, WidgetRef ref) async {
    final result = await ref.read(rbacRepositoryProvider).resetPassword(userId);
    ref.invalidate(userDetailsProvider(userId));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message']?.toString() ?? 'Reset initialized'),
        ),
      );
    }
  }

  Future<void> _setStatus(
    BuildContext context,
    WidgetRef ref,
    UserStatus status,
  ) async {
    await ref.read(rbacRepositoryProvider).updateUserStatus(userId, status);
    ref.invalidate(userDetailsProvider(userId));
    ref.invalidate(usersProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Status changed to ${status.wireName}')),
      );
    }
  }
}
