import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class NotificationRepository {
  const NotificationRepository(this._api);
  final NotificationApiService _api;

  Future<PaginatedResponse<NotificationMessage>> inbox(bool unreadOnly) =>
      _api.getInbox(unreadOnly: unreadOnly);
  Future<int> unreadCount() => _api.getUnreadCount();
  Future<void> markRead(String id) => _api.markRead(id);
  Future<int> markAllRead() => _api.markAllRead();
}
