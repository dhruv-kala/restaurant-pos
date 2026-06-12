import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/notification_providers.dart';

class NotificationCenterScreen extends ConsumerStatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  ConsumerState<NotificationCenterScreen> createState() =>
      _NotificationCenterScreenState();
}

class _NotificationCenterScreenState
    extends ConsumerState<NotificationCenterScreen> {
  bool unreadOnly = false;

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(notificationInboxProvider(unreadOnly));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            tooltip: 'Mark all read',
            onPressed: () async {
              await ref.read(notificationRepositoryProvider).markAllRead();
              ref.invalidate(notificationInboxProvider);
              ref.invalidate(notificationUnreadCountProvider);
            },
            icon: const Icon(Icons.done_all),
          ),
        ],
      ),
      body: Column(
        children: [
          SwitchListTile(
            title: const Text('Unread only'),
            value: unreadOnly,
            onChanged: (value) => setState(() => unreadOnly = value),
          ),
          Expanded(
            child: value.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('$error')),
              data: (page) => page.data.isEmpty
                  ? const Center(child: Text('No notifications.'))
                  : RefreshIndicator(
                      onRefresh: () => ref.refresh(
                        notificationInboxProvider(unreadOnly).future,
                      ),
                      child: ListView.separated(
                        itemCount: page.data.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final item = page.data[index];
                          return ListTile(
                            leading: Icon(
                              item.isRead
                                  ? Icons.notifications_none
                                  : Icons.notifications_active,
                            ),
                            title: Text(
                              item.title,
                              style: TextStyle(
                                fontWeight: item.isRead
                                    ? FontWeight.normal
                                    : FontWeight.bold,
                              ),
                            ),
                            subtitle: Text(
                              item.body,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Text(item.priority.wireName),
                            onTap: () async {
                              if (!item.isRead) {
                                await ref
                                    .read(notificationRepositoryProvider)
                                    .markRead(item.id);
                                ref.invalidate(notificationInboxProvider);
                                ref.invalidate(notificationUnreadCountProvider);
                              }
                              if (!context.mounted) return;
                              await showDialog<void>(
                                context: context,
                                builder: (dialogContext) => AlertDialog(
                                  title: Text(item.title),
                                  content: SelectableText(item.body),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.pop(dialogContext),
                                      child: const Text('Close'),
                                    ),
                                  ],
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
