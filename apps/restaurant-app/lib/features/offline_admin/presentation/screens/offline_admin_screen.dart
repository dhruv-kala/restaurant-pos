import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../../../core/offline/offline_sync_monitoring_service.dart';
import '../providers/offline_admin_providers.dart';

class OfflineAdminScreen extends ConsumerStatefulWidget {
  const OfflineAdminScreen({super.key});

  @override
  ConsumerState<OfflineAdminScreen> createState() => _OfflineAdminScreenState();
}

class _OfflineAdminScreenState extends ConsumerState<OfflineAdminScreen> {
  final _deviceIdController = TextEditingController(text: 'local-device');

  @override
  void dispose() {
    _deviceIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final user = authState.user;
    final tenantId = user?.tenantId;
    final outletId = user?.outletId;

    if (tenantId == null || outletId == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Offline Sync')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Offline administration requires an authenticated tenant and outlet assignment.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    final scope = (
      tenantId: tenantId,
      outletId: outletId,
      deviceId: _deviceIdController.text.trim().isEmpty
          ? 'local-device'
          : _deviceIdController.text.trim(),
    );
    final value = ref.watch(offlineSyncHealthProvider(scope));

    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Offline Sync'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Dashboard'),
              Tab(text: 'Queue'),
              Tab(text: 'Conflicts'),
              Tab(text: 'Recovery'),
            ],
          ),
          actions: [
            IconButton(
              tooltip: 'Refresh',
              onPressed: () => ref.invalidate(offlineSyncHealthProvider(scope)),
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: Column(
          children: [
            _ScopeHeader(
              tenantId: tenantId,
              outletId: outletId,
              deviceIdController: _deviceIdController,
              onChanged: () => setState(() {}),
            ),
            Expanded(
              child: value.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: Text('$error')),
                data: (snapshot) => TabBarView(
                  children: [
                    _DashboardTab(snapshot: snapshot),
                    _QueueTab(snapshot: snapshot),
                    _ConflictTab(snapshot: snapshot),
                    _RecoveryTab(scope: scope, snapshot: snapshot),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScopeHeader extends StatelessWidget {
  const _ScopeHeader({
    required this.tenantId,
    required this.outletId,
    required this.deviceIdController,
    required this.onChanged,
  });

  final String tenantId;
  final String outletId;
  final TextEditingController deviceIdController;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Wrap(
          spacing: 16,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            _ScopeChip(label: 'Tenant', value: tenantId),
            _ScopeChip(label: 'Outlet', value: outletId),
            SizedBox(
              width: 260,
              child: TextField(
                controller: deviceIdController,
                decoration: const InputDecoration(
                  labelText: 'Device ID',
                  helperText: 'Local SQLite scope',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                onSubmitted: (_) => onChanged(),
                onEditingComplete: onChanged,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScopeChip extends StatelessWidget {
  const _ScopeChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text('$label: $value'));
  }
}

class _DashboardTab extends StatelessWidget {
  const _DashboardTab({required this.snapshot});

  final OfflineSyncHealthSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {},
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _MetricCard(
                label: 'Pending',
                value: snapshot.pendingCount,
                icon: Icons.schedule,
              ),
              _MetricCard(
                label: 'Retrying',
                value: snapshot.retryingCount,
                icon: Icons.replay,
              ),
              _MetricCard(
                label: 'Failed',
                value: snapshot.failedCount,
                icon: Icons.error_outline,
              ),
              _MetricCard(
                label: 'Conflicts',
                value: snapshot.conflictCount,
                icon: Icons.merge_type,
              ),
              _MetricCard(
                label: 'Stale',
                value: snapshot.staleInProgressItems.length,
                icon: Icons.warning_amber,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Device state',
            children: [
              _DetailRow(
                label: 'Online',
                value: '${snapshot.deviceSyncState?.isOnline ?? false}',
              ),
              _DetailRow(
                label: 'Sync enabled',
                value: '${snapshot.deviceSyncState?.syncEnabled ?? false}',
              ),
              _DetailRow(
                label: 'Last pushed',
                value: _formatDate(snapshot.deviceSyncState?.lastPushedAt),
              ),
              _DetailRow(
                label: 'Last pulled',
                value: _formatDate(snapshot.deviceSyncState?.lastPulledAt),
              ),
            ],
          ),
          _SectionCard(
            title: 'Recent batches',
            children: snapshot.recentBatches.isEmpty
                ? [const Text('No sync batches recorded.')]
                : snapshot.recentBatches
                      .map(
                        (batch) => ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(batch.id),
                          subtitle: Text(
                            '${batch.queueItemIds.length} items | ${_formatDate(batch.completedAt ?? batch.startedAt ?? batch.createdAt)}',
                          ),
                          trailing: Text(batch.state.wireName),
                        ),
                      )
                      .toList(),
          ),
          _SectionCard(
            title: 'Checkpoints',
            children: snapshot.checkpoints.isEmpty
                ? [const Text('No pull checkpoints recorded.')]
                : snapshot.checkpoints
                      .map(
                        (checkpoint) => ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(checkpoint.module),
                          subtitle: Text(checkpoint.cursor),
                          trailing: Text(_formatDate(checkpoint.updatedAt)),
                        ),
                      )
                      .toList(),
          ),
        ],
      ),
    );
  }
}

class _QueueTab extends StatelessWidget {
  const _QueueTab({required this.snapshot});

  final OfflineSyncHealthSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final items = [
      ...snapshot.failedItems,
      ...snapshot.retryingItems,
      ...snapshot.staleInProgressItems,
    ];
    if (items.isEmpty) {
      return const Center(
        child: Text('No failed, retrying, or stale queue items.'),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) => _QueueItemTile(item: items[index]),
    );
  }
}

class _QueueItemTile extends StatelessWidget {
  const _QueueItemTile({required this.item});

  final SyncQueueItem item;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(_stateIcon(item.state)),
      title: Text('${item.module} / ${item.entityType}'),
      subtitle: Text(
        '${item.localId}\n${item.operationType.wireName} | attempts ${item.attemptCount} | ${item.errorCode ?? 'no error'}',
      ),
      isThreeLine: true,
      trailing: Text(item.state.wireName),
    );
  }
}

class _ConflictTab extends StatelessWidget {
  const _ConflictTab({required this.snapshot});

  final OfflineSyncHealthSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    if (snapshot.openConflicts.isEmpty) {
      return const Center(child: Text('No open conflicts.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: snapshot.openConflicts.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final conflict = snapshot.openConflicts[index];
        return ListTile(
          leading: const Icon(Icons.merge_type),
          title: Text('${conflict.entityType} ${conflict.entityId}'),
          subtitle: Text(
            'Queue: ${conflict.queueItemId}\nDetected: ${_formatDate(conflict.detectedAt)}',
          ),
          isThreeLine: true,
          trailing: Text(conflict.status.wireName),
          onTap: () => showDialog<void>(
            context: context,
            builder: (dialogContext) => AlertDialog(
              title: Text('Conflict ${conflict.id}'),
              content: SingleChildScrollView(
                child: SelectableText(
                  'Local:\n${conflict.localPayload}\n\nServer:\n${conflict.serverPayload}',
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Close'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _RecoveryTab extends ConsumerWidget {
  const _RecoveryTab({required this.scope, required this.snapshot});

  final OfflineAdminScope scope;
  final OfflineSyncHealthSnapshot snapshot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionCard(
          title: 'Recovery tools',
          children: [
            Text(
              'Recovery keeps local records intact. It only changes queue states so the sync worker can retry safely.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed:
                  snapshot.failedItems.isEmpty && snapshot.retryingItems.isEmpty
                  ? null
                  : () => _retryFailedAndRetrying(context, ref),
              icon: const Icon(Icons.replay),
              label: Text(
                'Retry failed/retrying (${snapshot.failedItems.length + snapshot.retryingItems.length})',
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: snapshot.staleInProgressItems.isEmpty
                  ? null
                  : () => _recoverStale(context, ref),
              icon: const Icon(Icons.restart_alt),
              label: Text(
                'Recover stale in-progress (${snapshot.staleInProgressItems.length})',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _retryFailedAndRetrying(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final ids = [
      ...snapshot.failedItems.map((item) => item.localId),
      ...snapshot.retryingItems.map((item) => item.localId),
    ];
    final result = await ref
        .read(offlineSyncMonitoringServiceProvider)
        .retryFailedItems(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          deviceId: scope.deviceId,
          localIds: ids,
          now: DateTime.now().toUtc(),
        );
    ref.invalidate(offlineSyncHealthProvider(scope));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Queued ${result.recoveredCount} items for retry.'),
      ),
    );
  }

  Future<void> _recoverStale(BuildContext context, WidgetRef ref) async {
    final result = await ref
        .read(offlineSyncMonitoringServiceProvider)
        .recoverStaleInProgressItems(
          tenantId: scope.tenantId,
          outletId: scope.outletId,
          deviceId: scope.deviceId,
          now: DateTime.now().toUtc(),
        );
    ref.invalidate(offlineSyncHealthProvider(scope));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Recovered ${result.recoveredCount} stale items.'),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final int value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon),
              const SizedBox(height: 12),
              Text('$value', style: Theme.of(context).textTheme.headlineMedium),
              Text(label),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label)),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

IconData _stateIcon(SyncQueueState state) => switch (state) {
  SyncQueueState.pending => Icons.schedule,
  SyncQueueState.inProgress => Icons.sync,
  SyncQueueState.success => Icons.check_circle,
  SyncQueueState.failed => Icons.error_outline,
  SyncQueueState.conflict => Icons.merge_type,
  SyncQueueState.retrying => Icons.replay,
};

String _formatDate(DateTime? value) {
  if (value == null) return 'Never';
  return value.toUtc().toIso8601String();
}
