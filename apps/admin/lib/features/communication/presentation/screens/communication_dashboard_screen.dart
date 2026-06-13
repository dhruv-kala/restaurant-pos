import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../providers/communication_providers.dart';

class CommunicationDashboardScreen extends ConsumerWidget {
  const CommunicationDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(communicationDashboardProvider);
    return summary.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _ErrorView(
        error: error,
        onRetry: () => ref.invalidate(communicationDashboardProvider),
      ),
      data: (value) => RefreshIndicator(
        onRefresh: () => ref.refresh(communicationDashboardProvider.future),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _MetricCard(
                  label: 'Messages sent',
                  value: '${value.totalMessages}',
                  icon: Icons.send_outlined,
                ),
                _MetricCard(
                  label: 'Delivery success',
                  value: '${(value.successRate * 100).toStringAsFixed(1)}%',
                  icon: Icons.check_circle_outline,
                ),
                _MetricCard(
                  label: 'Failed deliveries',
                  value: '${value.failedMessages}',
                  icon: Icons.error_outline,
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text(
              'Channel usage',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            ...CommunicationChannel.values.map(
              (channel) => ListTile(
                leading: Icon(_channelIcon(channel)),
                title: Text(channel.wireName),
                trailing: Text('${value.channelUsage[channel] ?? 0}'),
              ),
            ),
          ],
        ),
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
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 240,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(icon, size: 34),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: Theme.of(context).textTheme.headlineSmall),
                Text(label),
              ],
            ),
          ],
        ),
      ),
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

IconData _channelIcon(CommunicationChannel channel) => switch (channel) {
  CommunicationChannel.email => Icons.email_outlined,
  CommunicationChannel.sms => Icons.sms_outlined,
  CommunicationChannel.whatsapp => Icons.chat_outlined,
  CommunicationChannel.push => Icons.notifications_active_outlined,
};
