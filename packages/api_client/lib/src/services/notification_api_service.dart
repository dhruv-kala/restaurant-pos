import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class NotificationApiService {
  const NotificationApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<NotificationMessage>> getInbox({
    int page = 1,
    int limit = 20,
    bool unreadOnly = false,
    NotificationCategory? category,
    NotificationPriority? priority,
    String? search,
  }) async => PaginatedResponse<NotificationMessage>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.notifications,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (unreadOnly) 'unreadOnly': true,
          if (category != null) 'category': category.wireName,
          if (priority != null) 'priority': priority.wireName,
          if (search?.isNotEmpty ?? false) 'search': search,
        },
      ),
    ),
    NotificationMessage.fromJson,
  );

  Future<int> getUnreadCount() async =>
      _map(
            await _dio.get<Object?>(ApiEndpoints.notificationUnreadCount),
          )['unreadCount']
          as int;

  Future<NotificationMessage> getNotification(String id) async =>
      NotificationMessage.fromJson(
        _map(await _dio.get<Object?>(ApiEndpoints.notification(id))),
      );

  Future<void> markRead(String id) async {
    await _dio.patch<Object?>(ApiEndpoints.notificationRead(id));
  }

  Future<int> markAllRead() async =>
      _map(
            await _dio.post<Object?>(ApiEndpoints.notificationReadAll),
          )['updatedCount']
          as int;

  Future<List<NotificationPreference>> getPreferences() async => _list(
    await _dio.get<Object?>(ApiEndpoints.notificationPreferences),
  ).map(NotificationPreference.fromJson).toList(growable: false);

  Future<List<NotificationPreference>> updatePreferences(
    List<NotificationPreference> preferences,
  ) async => _list(
    await _dio.patch<Object?>(
      ApiEndpoints.notificationPreferences,
      data: {'preferences': preferences.map((item) => item.toJson()).toList()},
    ),
  ).map(NotificationPreference.fromJson).toList(growable: false);

  Future<PaginatedResponse<NotificationAdminRecord>> getAdminNotifications({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    NotificationCategory? category,
    NotificationPriority? priority,
    NotificationDeliveryStatus? deliveryStatus,
    String? search,
  }) async => PaginatedResponse<NotificationAdminRecord>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.notificationAdmin,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (tenantId != null) 'tenantId': tenantId,
          if (outletId != null) 'outletId': outletId,
          if (category != null) 'category': category.wireName,
          if (priority != null) 'priority': priority.wireName,
          if (deliveryStatus != null) 'deliveryStatus': deliveryStatus.wireName,
          if (search?.isNotEmpty ?? false) 'search': search,
        },
      ),
    ),
    NotificationAdminRecord.fromJson,
  );

  Future<NotificationAdminRecord> createNotification({
    required NotificationAudience audience,
    required NotificationCategory category,
    required NotificationPriority priority,
    required String title,
    required String body,
    String? tenantId,
    String? outletId,
    List<String>? userIds,
    String? actionUrl,
    bool isMandatory = false,
    DateTime? expiresAt,
  }) async => NotificationAdminRecord.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.notificationAdmin,
        data: {
          if (tenantId != null) 'tenantId': tenantId,
          'audience': audience.wireName,
          'category': category.wireName,
          'priority': priority.wireName,
          'title': title,
          'body': body,
          if (outletId != null) 'outletId': outletId,
          if (userIds != null) 'userIds': userIds,
          if (actionUrl != null) 'actionUrl': actionUrl,
          'isMandatory': isMandatory,
          if (expiresAt != null)
            'expiresAt': expiresAt.toUtc().toIso8601String(),
        },
      ),
    ),
  );
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}

List<Map<String, dynamic>> _list(Response<Object?> response) {
  if (response.data is List) {
    return (response.data! as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);
  }
  throw const FormatException('Expected a list response.');
}
