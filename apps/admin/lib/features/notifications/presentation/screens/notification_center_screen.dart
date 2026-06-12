import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

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
    final user = ref.watch(authNotifierProvider).user;
    final canPublish =
        user?.hasRole(UserRole.superAdmin) == true ||
        user?.hasRole(UserRole.tenantAdmin) == true ||
        user?.hasRole(UserRole.manager) == true ||
        user?.hasPermission('notifications.create') == true;
    return DefaultTabController(
      length: canPublish ? 2 : 1,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Notification Center'),
          bottom: TabBar(
            tabs: [
              const Tab(text: 'Inbox'),
              if (canPublish) const Tab(text: 'Publishing'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _Inbox(
              unreadOnly: unreadOnly,
              onUnreadChanged: (value) => setState(() => unreadOnly = value),
            ),
            if (canPublish) const _Publishing(),
          ],
        ),
      ),
    );
  }
}

class _Inbox extends ConsumerWidget {
  const _Inbox({required this.unreadOnly, required this.onUnreadChanged});

  final bool unreadOnly;
  final ValueChanged<bool> onUnreadChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(notificationInboxProvider(unreadOnly));
    return Column(
      children: [
        SwitchListTile(
          title: const Text('Unread only'),
          value: unreadOnly,
          onChanged: onUnreadChanged,
          secondary: IconButton(
            tooltip: 'Mark all read',
            onPressed: () async {
              await ref.read(notificationRepositoryProvider).markAllRead();
              ref.invalidate(notificationInboxProvider);
            },
            icon: const Icon(Icons.done_all),
          ),
        ),
        Expanded(
          child: value.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(child: Text('$error')),
            data: (page) => page.data.isEmpty
                ? const Center(child: Text('No notifications.'))
                : ListView.separated(
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
                          '${item.category.wireName} | ${item.body}',
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
                          }
                          if (!context.mounted) return;
                          await showDialog<void>(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: Text(item.title),
                              content: SelectableText(item.body),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
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
      ],
    );
  }
}

class _Publishing extends ConsumerWidget {
  const _Publishing();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(sentNotificationsProvider);
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _compose(context, ref),
        icon: const Icon(Icons.add_alert),
        label: const Text('New notification'),
      ),
      body: value.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (page) => page.data.isEmpty
            ? const Center(child: Text('No published notifications.'))
            : ListView.separated(
                itemCount: page.data.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final item = page.data[index];
                  return ListTile(
                    title: Text(item.title),
                    subtitle: Text(
                      '${item.audience.wireName} | '
                      '${item.deliveryStatus.wireName}',
                    ),
                    trailing: Text('${item.recipientCount} recipients'),
                  );
                },
              ),
      ),
    );
  }

  Future<void> _compose(BuildContext context, WidgetRef ref) async {
    final title = TextEditingController();
    final body = TextEditingController();
    final outlet = TextEditingController();
    final users = TextEditingController();
    var audience = NotificationAudience.tenant;
    var category = NotificationCategory.operations;
    var priority = NotificationPriority.normal;
    var mandatory = false;
    final submitted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Publish notification'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField(
                    initialValue: audience,
                    decoration: const InputDecoration(labelText: 'Audience'),
                    items: NotificationAudience.values
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(item.wireName),
                          ),
                        )
                        .toList(),
                    onChanged: (value) =>
                        setState(() => audience = value ?? audience),
                  ),
                  DropdownButtonFormField(
                    initialValue: category,
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: NotificationCategory.values
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(item.wireName),
                          ),
                        )
                        .toList(),
                    onChanged: (value) =>
                        setState(() => category = value ?? category),
                  ),
                  DropdownButtonFormField(
                    initialValue: priority,
                    decoration: const InputDecoration(labelText: 'Priority'),
                    items: NotificationPriority.values
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(item.wireName),
                          ),
                        )
                        .toList(),
                    onChanged: (value) =>
                        setState(() => priority = value ?? priority),
                  ),
                  TextField(
                    controller: title,
                    decoration: const InputDecoration(labelText: 'Title'),
                  ),
                  TextField(
                    controller: body,
                    maxLines: 4,
                    decoration: const InputDecoration(labelText: 'Message'),
                  ),
                  if (audience == NotificationAudience.outlet)
                    TextField(
                      controller: outlet,
                      decoration: const InputDecoration(labelText: 'Outlet ID'),
                    ),
                  if (audience == NotificationAudience.user)
                    TextField(
                      controller: users,
                      decoration: const InputDecoration(
                        labelText: 'User IDs (comma-separated)',
                      ),
                    ),
                  SwitchListTile(
                    title: const Text('Mandatory notification'),
                    value: mandatory,
                    onChanged: (value) => setState(() => mandatory = value),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Publish'),
            ),
          ],
        ),
      ),
    );
    if (submitted != true) return;
    try {
      await ref
          .read(notificationRepositoryProvider)
          .create(
            audience: audience,
            category: category,
            priority: priority,
            title: title.text,
            body: body.text,
            outletId: audience == NotificationAudience.outlet
                ? outlet.text.trim()
                : null,
            userIds: audience == NotificationAudience.user
                ? users.text
                      .split(',')
                      .map((item) => item.trim())
                      .where((item) => item.isNotEmpty)
                      .toList()
                : null,
            isMandatory: mandatory,
          );
      ref.invalidate(sentNotificationsProvider);
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    }
  }
}
