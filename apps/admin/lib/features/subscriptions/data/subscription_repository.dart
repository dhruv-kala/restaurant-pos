import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/subscription_query.dart';

class SubscriptionRepository {
  const SubscriptionRepository(this._api);
  final SubscriptionApiService _api;

  Future<PaginatedResponse<SubscriptionPlan>> plans(
    SubscriptionPlanQuery query,
  ) => _api.getPlans(
    page: query.page,
    limit: query.limit,
    status: query.status,
    search: query.search,
  );

  Future<List<SubscriptionPlan>> activePlans() async {
    final response = await _api.getPlans(
      limit: 100,
      status: SubscriptionPlanStatus.active,
    );
    return response.data;
  }

  Future<List<SubscriptionPlan>> planVersions(String id) =>
      _api.getPlanVersions(id);

  Future<SubscriptionPlan> createPlan({
    required String code,
    required String name,
    required SubscriptionBillingInterval billingInterval,
    required int priceMinor,
    required String currencyCode,
    required List<SubscriptionPlanFeature> features,
    String? description,
  }) => _api.createPlan(
    code: code,
    name: name,
    billingInterval: billingInterval,
    priceMinor: priceMinor,
    currencyCode: currencyCode,
    features: features,
    description: description,
  );

  Future<SubscriptionPlan> activatePlan(SubscriptionPlan plan) =>
      _api.activatePlan(id: plan.id, version: plan.version);

  Future<SubscriptionPlan> deactivatePlan(SubscriptionPlan plan) =>
      _api.deactivatePlan(id: plan.id, version: plan.version);

  Future<SubscriptionPlan> replacePlanFeatures(
    SubscriptionPlan plan,
    List<SubscriptionPlanFeature> features,
  ) => _api.replacePlanFeatures(
    id: plan.id,
    version: plan.version,
    features: features,
  );

  Future<PaginatedResponse<TenantSubscription>> tenantSubscriptions(
    TenantSubscriptionQuery query,
  ) => _api.getTenantSubscriptions(
    tenantId: query.tenantId,
    page: query.page,
    limit: query.limit,
    status: query.status,
  );

  Future<TenantSubscription> currentSubscription(String tenantId) =>
      _api.getCurrentSubscription(tenantId);

  Future<PaginatedResponse<TenantSubscriptionEvent>> subscriptionHistory(
    String tenantId,
  ) => _api.getSubscriptionHistory(tenantId: tenantId, limit: 50);

  Future<TenantSubscription> activateSubscription({
    required String tenantId,
    required String planId,
  }) => _api.activateSubscription(
    tenantId: tenantId,
    planId: planId,
    idempotencyKey: _idempotencyKey('subscription-activate'),
  );

  Future<TenantSubscription> changeSubscriptionPlan({
    required TenantSubscription subscription,
    required String planId,
    required bool upgrade,
    String? reason,
  }) => _api.changeSubscriptionPlan(
    tenantId: subscription.tenantId,
    subscriptionId: subscription.id,
    planId: planId,
    version: subscription.version,
    upgrade: upgrade,
    reason: reason,
    idempotencyKey: _idempotencyKey(
      upgrade ? 'subscription-upgrade' : 'subscription-downgrade',
    ),
  );

  Future<TenantSubscription> changeSubscriptionStatus({
    required TenantSubscription subscription,
    required SubscriptionStatusCommand command,
    String? reason,
  }) => _api.changeSubscriptionStatus(
    tenantId: subscription.tenantId,
    subscriptionId: subscription.id,
    version: subscription.version,
    command: command,
    reason: reason,
    idempotencyKey: _idempotencyKey('subscription-${command.name}'),
  );

  Future<List<TenantEntitlement>> entitlements(String tenantId) =>
      _api.getEntitlements(tenantId);

  Future<TenantEntitlement> upsertEntitlement({
    required String tenantId,
    required String featureKey,
    required bool isEnabled,
    required String reason,
    int? version,
    int? limitValue,
  }) => _api.upsertEntitlement(
    tenantId: tenantId,
    featureKey: featureKey,
    isEnabled: isEnabled,
    reason: reason,
    version: version,
    limitValue: limitValue,
    idempotencyKey: _idempotencyKey('entitlement-upsert'),
  );

  Future<TenantEntitlement> revokeEntitlement({
    required String tenantId,
    required TenantEntitlement entitlement,
    required String reason,
  }) => _api.revokeEntitlement(
    tenantId: tenantId,
    featureKey: entitlement.featureKey,
    version: entitlement.override?.version ?? 0,
    reason: reason,
    idempotencyKey: _idempotencyKey('entitlement-revoke'),
  );

  Future<List<UsageCounter>> usageCounters(String tenantId) =>
      _api.getUsageCounters(tenantId);

  Future<UsageLimitEvaluation> evaluateUsage(
    String tenantId,
    String featureKey,
  ) => _api.evaluateUsage(tenantId: tenantId, featureKey: featureKey);

  Future<UsageLimitEvaluation> adjustUsage({
    required String tenantId,
    required String featureKey,
    required String usageValue,
    required String reason,
    int? version,
    UsageCounterPeriod? period,
  }) => _api.adjustUsage(
    tenantId: tenantId,
    featureKey: featureKey,
    usageValue: usageValue,
    reason: reason,
    version: version,
    period: period,
    idempotencyKey: _idempotencyKey('usage-adjust'),
  );

  Future<List<TrialSubscription>> trials(String tenantId) =>
      _api.getTrials(tenantId);

  Future<PaginatedResponse<TrialSubscriptionEvent>> trialHistory({
    required String tenantId,
    required String trialId,
  }) => _api.getTrialHistory(tenantId: tenantId, trialId: trialId, limit: 50);

  Future<TrialSubscription> startTrial({
    required String tenantId,
    required String planId,
    required DateTime endsAt,
    String? reason,
  }) => _api.startTrial(
    tenantId: tenantId,
    planId: planId,
    endsAt: endsAt,
    reason: reason,
    idempotencyKey: _idempotencyKey('trial-start'),
  );

  Future<TrialSubscription> extendTrial({
    required TrialSubscription trial,
    required DateTime endsAt,
    String? reason,
  }) => _api.extendTrial(
    tenantId: trial.tenantId,
    trialId: trial.id,
    version: trial.version,
    endsAt: endsAt,
    reason: reason,
    idempotencyKey: _idempotencyKey('trial-extend'),
  );

  Future<TrialSubscription> expireTrial(
    TrialSubscription trial, {
    String? reason,
  }) => _api.expireTrial(
    tenantId: trial.tenantId,
    trialId: trial.id,
    version: trial.version,
    reason: reason,
    idempotencyKey: _idempotencyKey('trial-expire'),
  );

  Future<TrialSubscription> convertTrial({
    required TrialSubscription trial,
    required String planId,
    String? reason,
  }) => _api.convertTrial(
    tenantId: trial.tenantId,
    trialId: trial.id,
    version: trial.version,
    planId: planId,
    reason: reason,
    idempotencyKey: _idempotencyKey('trial-convert'),
  );

  Future<ExpireDueTrialsResult> expireDueTrials() =>
      _api.expireDueTrials(idempotencyKey: _idempotencyKey('trial-expire-due'));
}

String _idempotencyKey(String prefix) =>
    '$prefix:${DateTime.now().toUtc().microsecondsSinceEpoch}';
