import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../domain/table_query.dart';
import '../providers/table_providers.dart';

class TableSectionScreen extends ConsumerWidget {
  const TableSectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final outletId = ref.watch(activeOutletIdProvider);
    final query = TableQuery(outletId: outletId);
    final sections = ref.watch(tableSectionsProvider(query));
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: <Widget>[
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () => _showForm(context, ref, outletId, query),
              icon: const Icon(Icons.add),
              label: const Text('Add Section'),
            ),
          ),
          Expanded(
            child: sections.when(
              loading: () => const AppLoading(),
              error: (error, stack) => AppEmptyState(
                title: 'Unable to load sections',
                message: error.toString(),
              ),
              data: (response) => ListView(
                children: response.data
                    .map(
                      (section) => ListTile(
                        title: Text(section.name),
                        subtitle: Text(section.description ?? 'No description'),
                        onTap: () =>
                            _showForm(context, ref, outletId, query, section),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showForm(
    BuildContext context,
    WidgetRef ref,
    String outletId,
    TableQuery query, [
    TableSection? section,
  ]) async {
    final controller = TextEditingController(text: section?.name);
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(section == null ? 'Add Section' : 'Edit Section'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              await ref
                  .read(tablesRepositoryProvider)
                  .saveSection(
                    id: section?.id,
                    payload: <String, dynamic>{
                      if (section == null) 'outletId': outletId,
                      'name': controller.text.trim(),
                    },
                  );
              ref.invalidate(tableSectionsProvider(query));
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
