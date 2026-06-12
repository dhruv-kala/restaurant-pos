import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/rbac_query.dart';
import '../providers/rbac_providers.dart';
import 'add_user_screen.dart';
import 'user_details_screen.dart';

class UserListScreen extends ConsumerStatefulWidget {
  const UserListScreen({super.key});
  @override
  ConsumerState<UserListScreen> createState() => _UserListScreenState();
}

class _UserListScreenState extends ConsumerState<UserListScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final users = ref.watch(usersProvider(RbacUserQuery(search: _search)));
    return Scaffold(
      appBar: AppBar(
        title: const Text('User Directory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const AddUserScreen()),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                labelText: 'Search users',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (value) => setState(() => _search = value),
            ),
          ),
          Expanded(
            child: users.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
              data: (page) => page.data.isEmpty
                  ? const Center(child: Text('No users found'))
                  : ListView.builder(
                      itemCount: page.data.length,
                      itemBuilder: (_, index) {
                        final user = page.data[index];
                        return ListTile(
                          leading: const CircleAvatar(
                            child: Icon(Icons.person),
                          ),
                          title: Text(user.name),
                          subtitle: Text(
                            '${user.email}\n${user.roles.map((role) => role.name).join(', ')}',
                          ),
                          isThreeLine: true,
                          trailing: Text(user.status.wireName),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) =>
                                  UserDetailsScreen(userId: user.id),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
