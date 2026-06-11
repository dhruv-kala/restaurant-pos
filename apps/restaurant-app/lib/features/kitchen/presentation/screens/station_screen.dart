import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../providers/kitchen_providers.dart';

class StationScreen extends ConsumerWidget {
  const StationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stations = ref.watch(stationProvider);
    final user = ref.watch(authNotifierProvider).user;
    final canConfigure =
        user?.roles.any(
          <String>{'SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'}.contains,
        ) ??
        false;
    return Scaffold(
      body: stations.when(
        loading: () => const AppLoading(),
        error: (error, stack) => AppEmptyState(
          title: 'Unable to load stations',
          message: error.toString(),
        ),
        data: (values) => values.isEmpty
            ? const AppEmptyState(title: 'No kitchen stations')
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: values.length,
                itemBuilder: (context, index) {
                  final station = values[index];
                  return AppCard(
                    child: ListTile(
                      leading: CircleAvatar(
                        child: Text('${station.displayOrder + 1}'),
                      ),
                      title: Text(station.name),
                      subtitle: Text(
                        '${station.code} - ${station.menuItemIds.length} menu assignments',
                      ),
                      trailing: canConfigure
                          ? IconButton(
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () async {
                                await ref
                                    .read(kitchenRepositoryProvider)
                                    .deleteStation(station.id);
                                ref.invalidate(stationProvider);
                              },
                            )
                          : Chip(
                              label: Text(
                                station.isActive ? 'ACTIVE' : 'INACTIVE',
                              ),
                            ),
                    ),
                  );
                },
              ),
      ),
      floatingActionButton: canConfigure && user?.outletId != null
          ? FloatingActionButton.extended(
              onPressed: () => _create(context, ref, user!.outletId!),
              icon: const Icon(Icons.add),
              label: const Text('Station'),
            )
          : null,
    );
  }

  Future<void> _create(
    BuildContext context,
    WidgetRef ref,
    String outletId,
  ) async {
    final name = TextEditingController();
    final code = TextEditingController();
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Kitchen Station'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            TextField(
              controller: code,
              decoration: const InputDecoration(labelText: 'Code'),
              textCapitalization: TextCapitalization.characters,
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    if (accepted != true ||
        name.text.trim().isEmpty ||
        code.text.trim().isEmpty) {
      return;
    }
    await ref.read(kitchenRepositoryProvider).createStation(<String, dynamic>{
      'outletId': outletId,
      'name': name.text.trim(),
      'code': code.text.trim().toUpperCase(),
    });
    ref.invalidate(stationProvider);
  }
}
