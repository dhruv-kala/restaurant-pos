import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/table_query.dart';
import '../providers/table_providers.dart';
import 'reservation_list_screen.dart';
import 'table_list_screen.dart';
import 'table_section_screen.dart';

class TableLayoutScreen extends ConsumerWidget {
  const TableLayoutScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = TableQuery(outletId: ref.watch(activeOutletIdProvider));
    final tables = ref.watch(diningTablesProvider(query));
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Table Management'),
          bottom: const TabBar(
            tabs: <Widget>[
              Tab(text: 'Layout'),
              Tab(text: 'Tables'),
              Tab(text: 'Sections'),
              Tab(text: 'Reservations'),
            ],
          ),
        ),
        body: TabBarView(
          children: <Widget>[
            tables.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(child: Text(error.toString())),
              data: (response) => InteractiveViewer(
                constrained: false,
                child: SizedBox(
                  width: 1000,
                  height: 700,
                  child: Stack(
                    children: response.data
                        .map(
                          (table) => Positioned(
                            left: table.xPosition ?? 24,
                            top: table.yPosition ?? 24,
                            child: Card(
                              color: _statusColor(table.status.wireName),
                              child: SizedBox(
                                width: 120,
                                height: 80,
                                child: Center(
                                  child: Text(
                                    '${table.displayName ?? table.tableNumber}\n'
                                    '${table.capacity} seats',
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ),
            ),
            const TableListScreen(),
            const TableSectionScreen(),
            const ReservationListScreen(),
          ],
        ),
      ),
    );
  }

  Color _statusColor(String status) => switch (status) {
    'AVAILABLE' => Colors.green.shade100,
    'OCCUPIED' => Colors.red.shade100,
    'RESERVED' => Colors.amber.shade100,
    'CLEANING' => Colors.blue.shade100,
    _ => Colors.grey.shade300,
  };
}
