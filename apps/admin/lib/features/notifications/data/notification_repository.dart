import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class NotificationRepository {
  const NotificationRepository(this._api);
  final NotificationApiService _api;

  Future<PaginatedResponse<NotificationMessage>> inbox({
    bool unreadOnly = false,
  }) => _api.getInbox(unreadOnly: unreadOnly);

  Future<PaginatedResponse<NotificationAdminRecord>> sent() =>
      _api.getAdminNotifications();

  Future<void> markRead(String id) => _api.markRead(id);
  Future<int> markAllRead() => _api.markAllRead();

  Future<NotificationAdminRecord> create({
    required NotificationAudience audience,
    required NotificationCategory category,
    required NotificationPriority priority,
    required String title,
    required String body,
    String? outletId,
    List<String>? userIds,
    bool isMandatory = false,
  }) => _api.createNotification(
    audience: audience,
    category: category,
    priority: priority,
    title: title,
    body: body,
    outletId: outletId,
    userIds: userIds,
    isMandatory: isMandatory,
  );
}
