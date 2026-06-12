import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/audit_query.dart';
import '../providers/audit_providers.dart';
import 'audit_event_details_screen.dart';

class AuditDashboard extends ConsumerStatefulWidget {
  const AuditDashboard({super.key});

  @override
  ConsumerState<AuditDashboard> createState() => _AuditDashboardState();
}

class _AuditDashboardState extends ConsumerState<AuditDashboard> {
  final _search = TextEditingController();
  AuditQuery _query = const AuditQuery();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final events = ref.watch(auditEventsProvider(_query));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Audit & Activity'),
        actions: [
          IconButton(
            tooltip: 'Request JSON export',
            onPressed: _export,
            icon: const Icon(Icons.download),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(auditEventsProvider(_query)),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _search,
                    decoration: const InputDecoration(
                      labelText: 'Search action, target, or reason',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onSubmitted: (value) => setState(
                      () => _query = _query.copyWith(
                        page: 1,
                        search: value.trim(),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                DropdownButton<AuditResult?>(
                  value: _query.result,
                  hint: const Text('All results'),
                  items: [
                    const DropdownMenuItem<AuditResult?>(
                      value: null,
                      child: Text('All results'),
                    ),
                    ...AuditResult.values.map(
                      (result) => DropdownMenuItem<AuditResult?>(
                        value: result,
                        child: Text(result.wireName),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(
                    () => _query = _query.copyWith(
                      page: 1,
                      result: value,
                      clearResult: value == null,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: events.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
              data: (page) => page.data.isEmpty
                  ? const Center(child: Text('No audit events found.'))
                  : ListView.separated(
                      itemCount: page.data.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final event = page.data[index];
                        return ListTile(
                          leading: Icon(switch (event.result) {
                            AuditResult.success => Icons.check_circle,
                            AuditResult.denied => Icons.block,
                            AuditResult.failed => Icons.error,
                          }),
                          title: Text(event.action),
                          subtitle: Text(
                            '${event.targetType} | ${event.occurredAt.toLocal()}',
                          ),
                          trailing: Text('#${event.sequence}'),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) =>
                                  AuditEventDetailsScreen(eventId: event.id),
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

  Future<void> _export() async {
    try {
      final result = await ref
          .read(auditRepositoryProvider)
          .requestExport(_query, AuditExportFormat.json);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(result.message)));
      ref.invalidate(auditEventsProvider(_query));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    }
  }
}
