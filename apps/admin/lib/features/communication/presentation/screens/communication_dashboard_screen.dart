import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/communication_query.dart';
import '../providers/communication_providers.dart';

class CommunicationDashboardScreen extends ConsumerStatefulWidget {
  const CommunicationDashboardScreen({super.key});

  @override
  ConsumerState<CommunicationDashboardScreen> createState() =>
      _CommunicationDashboardScreenState();
}

class _CommunicationDashboardScreenState
    extends ConsumerState<CommunicationDashboardScreen> {
  late CommunicationAnalyticsQuery _query;

  @override
  void initState() {
    super.initState();
    _query = CommunicationAnalyticsQuery.last30Days();
  }

  @override
  Widget build(BuildContext context) {
    final report = ref.watch(communicationAnalyticsProvider(_query));
    return Column(
      children: [
        _AnalyticsFilters(
          query: _query,
          onChanged: (query) => setState(() => _query = query),
          onRefresh: () =>
              ref.invalidate(communicationAnalyticsProvider(_query)),
        ),
        Expanded(
          child: report.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => _ErrorView(
              error: error,
              onRetry: () =>
                  ref.invalidate(communicationAnalyticsProvider(_query)),
            ),
            data: (value) => RefreshIndicator(
              onRefresh: () =>
                  ref.refresh(communicationAnalyticsProvider(_query).future),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _Summary(metrics: value.summary),
                  const SizedBox(height: 24),
                  Text(
                    'Channel performance',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: value.channels
                        .map((channel) => _ChannelCard(value: channel))
                        .toList(),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Provider performance',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  ...value.providers.map(
                    (provider) => _ProviderTile(value: provider),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Delivery trends',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  if (value.trends.isEmpty)
                    const Text('No communication activity in this period.')
                  else
                    ...value.trends.map((trend) => _TrendTile(value: trend)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AnalyticsFilters extends StatelessWidget {
  const _AnalyticsFilters({
    required this.query,
    required this.onChanged,
    required this.onRefresh,
  });

  final CommunicationAnalyticsQuery query;
  final ValueChanged<CommunicationAnalyticsQuery> onChanged;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
    child: Wrap(
      spacing: 12,
      runSpacing: 12,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        OutlinedButton.icon(
          onPressed: () => _pickDate(context, true),
          icon: const Icon(Icons.date_range),
          label: Text('From ${_date(query.from)}'),
        ),
        OutlinedButton.icon(
          onPressed: () => _pickDate(context, false),
          icon: const Icon(Icons.event),
          label: Text('To ${_date(query.to)}'),
        ),
        DropdownButton<CommunicationAnalyticsGroup>(
          value: query.groupBy,
          items: CommunicationAnalyticsGroup.values
              .map(
                (item) => DropdownMenuItem(
                  value: item,
                  child: Text('Group by ${item.wireName.toLowerCase()}'),
                ),
              )
              .toList(),
          onChanged: (value) {
            if (value != null) onChanged(query.copyWith(groupBy: value));
          },
        ),
        IconButton(
          tooltip: 'Refresh analytics',
          onPressed: onRefresh,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
  );

  Future<void> _pickDate(BuildContext context, bool from) async {
    final initial = from ? query.from : query.to;
    final selected = await showDatePicker(
      context: context,
      initialDate: initial.toLocal(),
      firstDate: DateTime.now().subtract(const Duration(days: 366)),
      lastDate: DateTime.now(),
    );
    if (selected == null) return;
    final utc = DateTime.utc(selected.year, selected.month, selected.day);
    if (from) {
      onChanged(query.copyWith(from: utc));
    } else {
      onChanged(
        query.copyWith(
          to: utc
              .add(const Duration(days: 1))
              .subtract(const Duration(milliseconds: 1)),
        ),
      );
    }
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.metrics});
  final CommunicationDeliveryMetrics metrics;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    children: [
      _MetricCard(
        label: 'Total messages',
        value: '${metrics.totalMessages}',
        icon: Icons.send_outlined,
      ),
      _MetricCard(
        label: 'Delivered',
        value: '${metrics.deliveredMessages}',
        icon: Icons.check_circle_outline,
      ),
      _MetricCard(
        label: 'Success rate',
        value: _percent(metrics.successRate),
        icon: Icons.insights_outlined,
      ),
      _MetricCard(
        label: 'Failed',
        value: '${metrics.failedMessages}',
        icon: Icons.error_outline,
      ),
      _MetricCard(
        label: 'Pending',
        value: '${metrics.pendingMessages}',
        icon: Icons.schedule_outlined,
      ),
    ],
  );
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 210,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Icon(icon, size: 32),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value, style: Theme.of(context).textTheme.headlineSmall),
                  Text(label, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _ChannelCard extends StatelessWidget {
  const _ChannelCard({required this.value});
  final CommunicationChannelAnalytics value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 270,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(_channelIcon(value.channel)),
                const SizedBox(width: 8),
                Text(
                  value.channel.wireName,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text('${value.metrics.totalMessages} messages'),
            Text('${_percent(value.metrics.successRate)} success'),
            Text('${_percent(value.metrics.failureRate)} failure'),
            Text('Average delivery: ${_duration(value.averageDeliveryTimeMs)}'),
          ],
        ),
      ),
    ),
  );
}

class _ProviderTile extends StatelessWidget {
  const _ProviderTile({required this.value});
  final CommunicationProviderAnalytics value;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: Icon(
        value.status == CommunicationProviderStatus.active
            ? Icons.health_and_safety_outlined
            : Icons.pause_circle_outline,
      ),
      title: Text(value.displayName),
      subtitle: Text(
        '${value.channel.wireName} | ${value.metrics.totalMessages} messages | '
        '${_percent(value.metrics.successRate)} success | '
        '${_percent(value.metrics.failureRate)} failure\n'
        'Delivery ${_duration(value.averageDeliveryTimeMs)} | '
        'Webhook ${_duration(value.averageWebhookLatencyMs)}',
      ),
      isThreeLine: true,
      trailing: Text('${value.metrics.failedMessages} failed'),
    ),
  );
}

class _TrendTile extends StatelessWidget {
  const _TrendTile({required this.value});
  final CommunicationTrendPoint value;

  @override
  Widget build(BuildContext context) => ListTile(
    leading: const Icon(Icons.timeline),
    title: Text(_date(value.periodStart)),
    subtitle: LinearProgressIndicator(
      value: value.successRate.clamp(0, 1),
      minHeight: 8,
    ),
    trailing: Text(
      '${value.deliveredMessages}/${value.totalMessages}\n'
      '${_percent(value.successRate)}',
      textAlign: TextAlign.end,
    ),
  );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('$error'),
        const SizedBox(height: 8),
        FilledButton(onPressed: onRetry, child: const Text('Retry')),
      ],
    ),
  );
}

String _date(DateTime value) =>
    '${value.toLocal().year.toString().padLeft(4, '0')}-'
    '${value.toLocal().month.toString().padLeft(2, '0')}-'
    '${value.toLocal().day.toString().padLeft(2, '0')}';

String _percent(double value) => '${(value * 100).toStringAsFixed(1)}%';

String _duration(double? milliseconds) {
  if (milliseconds == null) return 'n/a';
  if (milliseconds < 1000) return '${milliseconds.round()} ms';
  if (milliseconds < 60000) {
    return '${(milliseconds / 1000).toStringAsFixed(1)} s';
  }
  return '${(milliseconds / 60000).toStringAsFixed(1)} min';
}

IconData _channelIcon(CommunicationChannel channel) => switch (channel) {
  CommunicationChannel.email => Icons.email_outlined,
  CommunicationChannel.sms => Icons.sms_outlined,
  CommunicationChannel.whatsapp => Icons.chat_outlined,
  CommunicationChannel.push => Icons.notifications_active_outlined,
};
