import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/notification_repository.dart';

final notificationApiServiceProvider = Provider<NotificationApiService>(
  (ref) => NotificationApiService(ref.watch(dioProvider)),
);
final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => NotificationRepository(ref.watch(notificationApiServiceProvider)),
);
final notificationInboxProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<NotificationMessage>, bool>(
      (ref, unreadOnly) => ref
          .watch(notificationRepositoryProvider)
          .inbox(unreadOnly: unreadOnly),
    );
final sentNotificationsProvider =
    FutureProvider.autoDispose<PaginatedResponse<NotificationAdminRecord>>(
      (ref) => ref.watch(notificationRepositoryProvider).sent(),
    );
