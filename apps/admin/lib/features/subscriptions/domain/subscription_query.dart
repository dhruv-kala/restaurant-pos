import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class SubscriptionPlanQuery {
  const SubscriptionPlanQuery({
    this.page = 1,
    this.limit = 20,
    this.status,
    this.search,
  });

  final int page;
  final int limit;
  final SubscriptionPlanStatus? status;
  final String? search;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubscriptionPlanQuery &&
          runtimeType == other.runtimeType &&
          page == other.page &&
          limit == other.limit &&
          status == other.status &&
          search == other.search;

  @override
  int get hashCode => Object.hash(page, limit, status, search);
}

class TenantSubscriptionQuery {
  const TenantSubscriptionQuery({
    required this.tenantId,
    this.page = 1,
    this.limit = 20,
    this.status,
  });

  final String tenantId;
  final int page;
  final int limit;
  final TenantSubscriptionStatus? status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TenantSubscriptionQuery &&
          runtimeType == other.runtimeType &&
          tenantId == other.tenantId &&
          page == other.page &&
          limit == other.limit &&
          status == other.status;

  @override
  int get hashCode => Object.hash(tenantId, page, limit, status);
}
