import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../domain/table_query.dart';
import '../providers/table_providers.dart';
import 'add_table_screen.dart';
import 'edit_table_screen.dart';

class TableListScreen extends ConsumerWidget {
  const TableListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = TableQuery(outletId: ref.watch(activeOutletIdProvider));
    final tables = ref.watch(diningTablesProvider(query));
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: <Widget>[
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () async {
                await Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    builder: (_) => const AddTableScreen(),
                  ),
                );
                ref.invalidate(diningTablesProvider(query));
              },
              icon: const Icon(Icons.add),
              label: const Text('Add Table'),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: tables.when(
              loading: () => const AppLoading(),
              error: (error, stack) => AppEmptyState(
                title: 'Unable to load tables',
                message: error.toString(),
              ),
              data: (response) => ListView.builder(
                itemCount: response.data.length,
                itemBuilder: (context, index) {
                  final table = response.data[index];
                  return ListTile(
                    leading: const Icon(Icons.table_restaurant),
                    title: Text(table.displayName ?? table.tableNumber),
                    subtitle: Text(
                      '${table.capacity} seats - ${table.status.wireName}',
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.edit_outlined),
                      onPressed: () => Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(
                          builder: (_) => EditTableScreen(table: table),
                        ),
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
