import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/communication_query.dart';
import '../providers/communication_providers.dart';

class CommunicationHistoryScreen extends ConsumerStatefulWidget {
  const CommunicationHistoryScreen({super.key});

  @override
  ConsumerState<CommunicationHistoryScreen> createState() =>
      _CommunicationHistoryScreenState();
}

class _CommunicationHistoryScreenState
    extends ConsumerState<CommunicationHistoryScreen> {
  final _search = TextEditingController();
  CommunicationMessageQuery _query = const CommunicationMessageQuery();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(communicationMessagesProvider(_query));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              SizedBox(
                width: 360,
                child: TextField(
                  controller: _search,
                  decoration: const InputDecoration(
                    labelText: 'Search recipient, subject, or idempotency key',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onSubmitted: (value) => setState(
                    () =>
                        _query = _query.copyWith(page: 1, search: value.trim()),
                  ),
                ),
              ),
              _ChannelFilter(
                value: _query.channel,
                onChanged: (value) => setState(
                  () => _query = _query.copyWith(
                    page: 1,
                    channel: value,
                    clearChannel: value == null,
                  ),
                ),
              ),
              DropdownButton<CommunicationMessageStatus?>(
                value: _query.status,
                hint: const Text('All statuses'),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('All statuses'),
                  ),
                  ...CommunicationMessageStatus.values.map(
                    (status) => DropdownMenuItem(
                      value: status,
                      child: Text(status.wireName),
                    ),
                  ),
                ],
                onChanged: (value) => setState(
                  () => _query = _query.copyWith(
                    page: 1,
                    status: value,
                    clearStatus: value == null,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Refresh',
                onPressed: () =>
                    ref.invalidate(communicationMessagesProvider(_query)),
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
        ),
        Expanded(
          child: messages.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(child: Text('$error')),
            data: (page) => page.data.isEmpty
                ? const Center(child: Text('No communication messages found.'))
                : ListView.separated(
                    itemCount: page.data.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final message = page.data[index];
                      return ListTile(
                        leading: Icon(_statusIcon(message.status)),
                        title: Text(
                          message.subjectSnapshot ??
                              '${message.channel.wireName} message',
                        ),
                        subtitle: Text(
                          '${message.recipientAddressMasked} | '
                          '${message.createdAt.toLocal()}',
                        ),
                        trailing: Chip(label: Text(message.status.wireName)),
                        onTap: () => _showMessage(context, message),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Future<void> _showMessage(
    BuildContext context,
    CommunicationMessage message,
  ) => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(message.subjectSnapshot ?? 'Communication message'),
      content: SizedBox(
        width: 680,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${message.channel.wireName} | ${message.status.wireName}'),
              Text('Recipient: ${message.recipientAddressMasked}'),
              if (message.provider != null)
                Text('Provider: ${message.provider!.name}'),
              if (message.template != null)
                Text('Template: ${message.template!.name}'),
              const Divider(),
              SelectableText(message.bodySnapshot),
              const SizedBox(height: 16),
              Text(
                'Delivery attempts',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Consumer(
                builder: (context, ref, _) {
                  final attempts = ref.watch(
                    communicationAttemptsProvider(message.id),
                  );
                  return attempts.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (error, _) => Text('$error'),
                    data: (items) => items.isEmpty
                        ? const Text('No delivery attempts.')
                        : Column(
                            children: items
                                .map(
                                  (attempt) => ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(
                                      'Attempt ${attempt.attemptNumber} | '
                                      '${attempt.status.wireName}',
                                    ),
                                    subtitle: Text(
                                      attempt.errorCode ??
                                          attempt.providerMessageId ??
                                          'Provider response recorded',
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );
}

class _ChannelFilter extends StatelessWidget {
  const _ChannelFilter({required this.value, required this.onChanged});
  final CommunicationChannel? value;
  final ValueChanged<CommunicationChannel?> onChanged;

  @override
  Widget build(BuildContext context) => DropdownButton<CommunicationChannel?>(
    value: value,
    hint: const Text('All channels'),
    items: [
      const DropdownMenuItem(value: null, child: Text('All channels')),
      ...CommunicationChannel.values.map(
        (channel) =>
            DropdownMenuItem(value: channel, child: Text(channel.wireName)),
      ),
    ],
    onChanged: onChanged,
  );
}

IconData _statusIcon(CommunicationMessageStatus status) => switch (status) {
  CommunicationMessageStatus.delivered ||
  CommunicationMessageStatus.read => Icons.check_circle_outline,
  CommunicationMessageStatus.failed => Icons.error_outline,
  CommunicationMessageStatus.cancelled => Icons.cancel_outlined,
  CommunicationMessageStatus.sent => Icons.send_outlined,
  _ => Icons.schedule_outlined,
};
