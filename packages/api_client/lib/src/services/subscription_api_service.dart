import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class SubscriptionApiService {
  const SubscriptionApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<SubscriptionPlan>> getPlans({
    int page = 1,
    int limit = 20,
    SubscriptionPlanStatus? status,
    String? code,
    String? search,
  }) async => PaginatedResponse<SubscriptionPlan>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.subscriptionPlans,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (status != null) 'status': status.wireName,
          if (code?.isNotEmpty ?? false) 'code': code,
          if (search?.isNotEmpty ?? false) 'search': search,
        },
      ),
    ),
    SubscriptionPlan.fromJson,
  );

  Future<SubscriptionPlan> getPlan(String id) async =>
      SubscriptionPlan.fromJson(
        _map(await _dio.get<Object?>(ApiEndpoints.subscriptionPlan(id))),
      );

  Future<List<SubscriptionPlan>> getPlanVersions(String id) async => _list(
    await _dio.get<Object?>(ApiEndpoints.subscriptionPlanVersions(id)),
  ).map(SubscriptionPlan.fromJson).toList(growable: false);

  Future<SubscriptionPlan> createPlan({
    required String code,
    required String name,
    required SubscriptionBillingInterval billingInterval,
    required int priceMinor,
    required String currencyCode,
    required List<SubscriptionPlanFeature> features,
    String? description,
  }) async => SubscriptionPlan.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.subscriptionPlans,
        data: {
          'code': code,
          'name': name,
          if (description?.isNotEmpty ?? false) 'description': description,
          'billingInterval': billingInterval.wireName,
          'priceMinor': priceMinor,
          'currencyCode': currencyCode,
          'features': features.map((item) => item.toJson()).toList(),
        },
      ),
    ),
  );

  Future<SubscriptionPlan> updatePlan({
    required String id,
    required int version,
    String? name,
    String? description,
    SubscriptionBillingInterval? billingInterval,
    int? priceMinor,
    String? currencyCode,
  }) async => SubscriptionPlan.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.subscriptionPlan(id),
        data: {
          'version': version,
          if (name != null) 'name': name,
          if (description != null) 'description': description,
          if (billingInterval != null)
            'billingInterval': billingInterval.wireName,
          if (priceMinor != null) 'priceMinor': priceMinor,
          if (currencyCode != null) 'currencyCode': currencyCode,
        },
      ),
    ),
  );

  Future<SubscriptionPlan> replacePlanFeatures({
    required String id,
    required int version,
    required List<SubscriptionPlanFeature> features,
  }) async => SubscriptionPlan.fromJson(
    _map(
      await _dio.put<Object?>(
        ApiEndpoints.subscriptionPlanFeatures(id),
        data: {
          'version': version,
          'features': features.map((item) => item.toJson()).toList(),
        },
      ),
    ),
  );

  Future<SubscriptionPlan> activatePlan({
    required String id,
    required int version,
  }) async => SubscriptionPlan.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.subscriptionPlanActivate(id),
        data: {'version': version},
      ),
    ),
  );

  Future<SubscriptionPlan> deactivatePlan({
    required String id,
    required int version,
  }) async => SubscriptionPlan.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.subscriptionPlanDeactivate(id),
        data: {'version': version},
      ),
    ),
  );

  Future<PaginatedResponse<TenantSubscription>> getTenantSubscriptions({
    required String tenantId,
    int page = 1,
    int limit = 20,
    TenantSubscriptionStatus? status,
  }) async => PaginatedResponse<TenantSubscription>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.tenantSubscriptions(tenantId),
        queryParameters: {
          'page': page,
          'limit': limit,
          if (status != null) 'status': status.wireName,
        },
      ),
    ),
    TenantSubscription.fromJson,
  );

  Future<TenantSubscription> getCurrentSubscription(String tenantId) async =>
      TenantSubscription.fromJson(
        _map(
          await _dio.get<Object?>(
            ApiEndpoints.tenantSubscriptionCurrent(tenantId),
          ),
        ),
      );

  Future<PaginatedResponse<TenantSubscriptionEvent>> getSubscriptionHistory({
    required String tenantId,
    String? subscriptionId,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<TenantSubscriptionEvent>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.tenantSubscriptionHistory(tenantId),
        queryParameters: {
          'page': page,
          'limit': limit,
          if (subscriptionId?.isNotEmpty ?? false)
            'subscriptionId': subscriptionId,
        },
      ),
    ),
    TenantSubscriptionEvent.fromJson,
  );

  Future<TenantSubscription> activateSubscription({
    required String tenantId,
    required String planId,
    required String idempotencyKey,
    DateTime? startsAt,
    DateTime? endsAt,
  }) async => TenantSubscription.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.tenantSubscriptionActivate(tenantId),
        data: {
          'planId': planId,
          if (startsAt != null) 'startsAt': startsAt.toUtc().toIso8601String(),
          if (endsAt != null) 'endsAt': endsAt.toUtc().toIso8601String(),
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<TenantSubscription> changeSubscriptionPlan({
    required String tenantId,
    required String subscriptionId,
    required String planId,
    required int version,
    required String idempotencyKey,
    required bool upgrade,
    String? reason,
  }) async => TenantSubscription.fromJson(
    _map(
      await _dio.post<Object?>(
        upgrade
            ? ApiEndpoints.tenantSubscriptionUpgrade(tenantId, subscriptionId)
            : ApiEndpoints.tenantSubscriptionDowngrade(
                tenantId,
                subscriptionId,
              ),
        data: {
          'planId': planId,
          'version': version,
          if (reason?.isNotEmpty ?? false) 'reason': reason,
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<TenantSubscription> changeSubscriptionStatus({
    required String tenantId,
    required String subscriptionId,
    required int version,
    required String idempotencyKey,
    required SubscriptionStatusCommand command,
    String? reason,
  }) async => TenantSubscription.fromJson(
    _map(
      await _dio.post<Object?>(
        switch (command) {
          SubscriptionStatusCommand.suspend =>
            ApiEndpoints.tenantSubscriptionSuspend(tenantId, subscriptionId),
          SubscriptionStatusCommand.resume =>
            ApiEndpoints.tenantSubscriptionResume(tenantId, subscriptionId),
          SubscriptionStatusCommand.expire =>
            ApiEndpoints.tenantSubscriptionExpire(tenantId, subscriptionId),
          SubscriptionStatusCommand.cancel =>
            ApiEndpoints.tenantSubscriptionCancel(tenantId, subscriptionId),
        },
        data: {
          'version': version,
          if (reason?.isNotEmpty ?? false) 'reason': reason,
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<List<TenantEntitlement>> getEntitlements(String tenantId) async {
    final payload = _map(
      await _dio.get<Object?>(ApiEndpoints.tenantEntitlements(tenantId)),
    );
    return _mapList(
      payload['data'],
    ).map(TenantEntitlement.fromJson).toList(growable: false);
  }

  Future<TenantEntitlement> evaluateEntitlement({
    required String tenantId,
    required String featureKey,
  }) async => TenantEntitlement.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.tenantEntitlement(tenantId, featureKey),
      ),
    ),
  );

  Future<TenantEntitlement> upsertEntitlement({
    required String tenantId,
    required String featureKey,
    required bool isEnabled,
    required String reason,
    required String idempotencyKey,
    int? version,
    int? limitValue,
    Map<String, dynamic>? metadata,
    DateTime? effectiveFrom,
    DateTime? effectiveTo,
  }) async => TenantEntitlement.fromJson(
    _map(
      await _dio.put<Object?>(
        ApiEndpoints.tenantEntitlement(tenantId, featureKey),
        data: {
          if (version != null) 'version': version,
          'isEnabled': isEnabled,
          if (limitValue != null) 'limitValue': limitValue,
          if (metadata != null) 'metadata': metadata,
          'reason': reason,
          if (effectiveFrom != null)
            'effectiveFrom': effectiveFrom.toUtc().toIso8601String(),
          if (effectiveTo != null)
            'effectiveTo': effectiveTo.toUtc().toIso8601String(),
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<TenantEntitlement> revokeEntitlement({
    required String tenantId,
    required String featureKey,
    required int version,
    required String reason,
    required String idempotencyKey,
  }) async => TenantEntitlement.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.tenantEntitlementRevoke(tenantId, featureKey),
        data: {
          'version': version,
          'reason': reason,
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<List<UsageCounter>> getUsageCounters(String tenantId) async {
    final payload = _map(
      await _dio.get<Object?>(ApiEndpoints.tenantUsage(tenantId)),
    );
    return _mapList(
      payload['data'],
    ).map(UsageCounter.fromJson).toList(growable: false);
  }

  Future<UsageLimitEvaluation> evaluateUsage({
    required String tenantId,
    required String featureKey,
  }) async => UsageLimitEvaluation.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.tenantUsageFeature(tenantId, featureKey),
      ),
    ),
  );

  Future<UsageLimitEvaluation> adjustUsage({
    required String tenantId,
    required String featureKey,
    required String usageValue,
    required String reason,
    required String idempotencyKey,
    int? version,
    UsageCounterPeriod? period,
    DateTime? periodAt,
  }) async => UsageLimitEvaluation.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.tenantUsageAdjust(tenantId, featureKey),
        data: {
          if (version != null) 'version': version,
          'usageValue': usageValue,
          if (period != null) 'period': period.wireName,
          if (periodAt != null) 'periodAt': periodAt.toUtc().toIso8601String(),
          'reason': reason,
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<List<TrialSubscription>> getTrials(String tenantId) async {
    final payload = _map(
      await _dio.get<Object?>(ApiEndpoints.tenantTrials(tenantId)),
    );
    return _mapList(
      payload['data'],
    ).map(TrialSubscription.fromJson).toList(growable: false);
  }

  Future<PaginatedResponse<TrialSubscriptionEvent>> getTrialHistory({
    required String tenantId,
    required String trialId,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<TrialSubscriptionEvent>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.tenantTrialHistory(tenantId, trialId),
        queryParameters: {'page': page, 'limit': limit},
      ),
    ),
    TrialSubscriptionEvent.fromJson,
  );

  Future<TrialSubscription> startTrial({
    required String tenantId,
    required String planId,
    required DateTime endsAt,
    required String idempotencyKey,
    DateTime? startsAt,
    String? reason,
  }) async => TrialSubscription.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.tenantTrialStart(tenantId),
        data: {
          'planId': planId,
          if (startsAt != null) 'startsAt': startsAt.toUtc().toIso8601String(),
          'endsAt': endsAt.toUtc().toIso8601String(),
          if (reason?.isNotEmpty ?? false) 'reason': reason,
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<TrialSubscription> extendTrial({
    required String tenantId,
    required String trialId,
    required int version,
    required DateTime endsAt,
    required String idempotencyKey,
    String? reason,
  }) async => TrialSubscription.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.tenantTrialExtend(tenantId, trialId),
        data: {
          'version': version,
          'endsAt': endsAt.toUtc().toIso8601String(),
          if (reason?.isNotEmpty ?? false) 'reason': reason,
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<TrialSubscription> expireTrial({
    required String tenantId,
    required String trialId,
    required int version,
    required String idempotencyKey,
    String? reason,
  }) async => TrialSubscription.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.tenantTrialExpire(tenantId, trialId),
        data: {
          'version': version,
          if (reason?.isNotEmpty ?? false) 'reason': reason,
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<TrialSubscription> convertTrial({
    required String tenantId,
    required String trialId,
    required int version,
    required String planId,
    required String idempotencyKey,
    DateTime? endsAt,
    String? reason,
  }) async => TrialSubscription.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.tenantTrialConvert(tenantId, trialId),
        data: {
          'version': version,
          'planId': planId,
          if (endsAt != null) 'endsAt': endsAt.toUtc().toIso8601String(),
          if (reason?.isNotEmpty ?? false) 'reason': reason,
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );

  Future<ExpireDueTrialsResult> expireDueTrials({
    required String idempotencyKey,
    DateTime? asOf,
  }) async => ExpireDueTrialsResult.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.subscriptionTrialsExpireDue,
        data: {
          if (asOf != null) 'asOf': asOf.toUtc().toIso8601String(),
          'idempotencyKey': idempotencyKey,
        },
      ),
    ),
  );
}

enum SubscriptionStatusCommand { suspend, resume, expire, cancel }

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

List<Map<String, dynamic>> _mapList(Object? value) =>
    (value as List<dynamic>? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);
