import 'analytics_event.dart';

abstract interface class AnalyticsService {
  Future<void> track(AnalyticsEvent event);

  Future<void> identify({
    required String userId,
    String? tenantId,
    String? outletId,
  });

  Future<void> reset();
}

final class NoOpAnalyticsService implements AnalyticsService {
  const NoOpAnalyticsService();

  @override
  Future<void> identify({
    required String userId,
    String? tenantId,
    String? outletId,
  }) async {}

  @override
  Future<void> reset() async {}

  @override
  Future<void> track(AnalyticsEvent event) async {}
}
