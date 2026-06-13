enum SubscriptionPlanStatus {
  draft,
  active,
  inactive;

  factory SubscriptionPlanStatus.fromJson(Object? value) => switch (value) {
    'DRAFT' => SubscriptionPlanStatus.draft,
    'ACTIVE' => SubscriptionPlanStatus.active,
    'INACTIVE' => SubscriptionPlanStatus.inactive,
    _ => throw FormatException('Unsupported subscription plan status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum SubscriptionBillingInterval {
  monthly,
  yearly;

  factory SubscriptionBillingInterval.fromJson(Object? value) =>
      switch (value) {
        'MONTHLY' => SubscriptionBillingInterval.monthly,
        'YEARLY' => SubscriptionBillingInterval.yearly,
        _ => throw FormatException('Unsupported billing interval: $value'),
      };

  String get wireName => name.toUpperCase();
}

enum TenantSubscriptionStatus {
  trial,
  active,
  suspended,
  expired,
  cancelled;

  factory TenantSubscriptionStatus.fromJson(Object? value) => switch (value) {
    'TRIAL' => TenantSubscriptionStatus.trial,
    'ACTIVE' => TenantSubscriptionStatus.active,
    'SUSPENDED' => TenantSubscriptionStatus.suspended,
    'EXPIRED' => TenantSubscriptionStatus.expired,
    'CANCELLED' => TenantSubscriptionStatus.cancelled,
    _ => throw FormatException(
      'Unsupported tenant subscription status: $value',
    ),
  };

  String get wireName => name.toUpperCase();
}

enum TrialSubscriptionStatus {
  active,
  expired,
  converted;

  factory TrialSubscriptionStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => TrialSubscriptionStatus.active,
    'EXPIRED' => TrialSubscriptionStatus.expired,
    'CONVERTED' => TrialSubscriptionStatus.converted,
    _ => throw FormatException('Unsupported trial subscription status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum UsageCounterPeriod {
  lifetime,
  daily,
  monthly;

  factory UsageCounterPeriod.fromJson(Object? value) => switch (value) {
    'LIFETIME' => UsageCounterPeriod.lifetime,
    'DAILY' => UsageCounterPeriod.daily,
    'MONTHLY' => UsageCounterPeriod.monthly,
    _ => throw FormatException('Unsupported usage counter period: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum UsageLimitAction {
  block,
  warn,
  allow;

  factory UsageLimitAction.fromJson(Object? value) => switch (value) {
    'BLOCK' => UsageLimitAction.block,
    'WARN' => UsageLimitAction.warn,
    'ALLOW' => UsageLimitAction.allow,
    _ => throw FormatException('Unsupported usage limit action: $value'),
  };

  String get wireName => name.toUpperCase();
}

class SubscriptionPlanFeature {
  const SubscriptionPlanFeature({
    required this.featureKey,
    required this.isEnabled,
    this.id,
    this.limitValue,
    this.metadata,
    this.createdAt,
    this.updatedAt,
  });

  factory SubscriptionPlanFeature.fromJson(Map<String, dynamic> json) =>
      SubscriptionPlanFeature(
        id: json['id']?.toString(),
        featureKey: _requiredString(json, 'featureKey'),
        isEnabled: _requiredBool(json, 'isEnabled'),
        limitValue: _optionalInt(json['limitValue']),
        metadata: _mapOrNull(json['metadata']),
        createdAt: _optionalDate(json['createdAt']),
        updatedAt: _optionalDate(json['updatedAt']),
      );

  final String? id;
  final String featureKey;
  final bool isEnabled;
  final int? limitValue;
  final Map<String, dynamic>? metadata;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'featureKey': featureKey,
    'isEnabled': isEnabled,
    if (limitValue != null) 'limitValue': limitValue,
    if (metadata != null) 'metadata': metadata,
  };
}

class SubscriptionPlan {
  const SubscriptionPlan({
    required this.id,
    required this.code,
    required this.versionNumber,
    required this.name,
    required this.billingInterval,
    required this.priceMinor,
    required this.currencyCode,
    required this.status,
    required this.features,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.activatedAt,
    this.deactivatedAt,
  });

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) =>
      SubscriptionPlan(
        id: _requiredString(json, 'id'),
        code: _requiredString(json, 'code'),
        versionNumber: _requiredInt(json, 'versionNumber'),
        name: _requiredString(json, 'name'),
        description: json['description']?.toString(),
        billingInterval: SubscriptionBillingInterval.fromJson(
          json['billingInterval'],
        ),
        priceMinor: _requiredInt(json, 'priceMinor'),
        currencyCode: _requiredString(json, 'currencyCode'),
        status: SubscriptionPlanStatus.fromJson(json['status']),
        features: _mapList(
          json['features'],
        ).map(SubscriptionPlanFeature.fromJson).toList(growable: false),
        activatedAt: _optionalDate(json['activatedAt']),
        deactivatedAt: _optionalDate(json['deactivatedAt']),
        version: _requiredInt(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String code;
  final int versionNumber;
  final String name;
  final String? description;
  final SubscriptionBillingInterval billingInterval;
  final int priceMinor;
  final String currencyCode;
  final SubscriptionPlanStatus status;
  final List<SubscriptionPlanFeature> features;
  final DateTime? activatedAt;
  final DateTime? deactivatedAt;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class SubscriptionPlanSummary {
  const SubscriptionPlanSummary({
    required this.id,
    required this.code,
    required this.versionNumber,
    this.name,
  });

  factory SubscriptionPlanSummary.fromJson(Map<String, dynamic> json) =>
      SubscriptionPlanSummary(
        id: _requiredString(json, 'id'),
        code: _requiredString(json, 'code'),
        versionNumber: _requiredInt(json, 'versionNumber'),
        name: json['name']?.toString(),
      );

  final String id;
  final String code;
  final int versionNumber;
  final String? name;
}

class TenantSubscription {
  const TenantSubscription({
    required this.id,
    required this.tenantId,
    required this.status,
    required this.startsAt,
    required this.plan,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.endsAt,
    this.suspendedAt,
    this.expiredAt,
    this.cancelledAt,
  });

  factory TenantSubscription.fromJson(Map<String, dynamic> json) =>
      TenantSubscription(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        status: TenantSubscriptionStatus.fromJson(json['status']),
        startsAt: _date(json, 'startsAt'),
        endsAt: _optionalDate(json['endsAt']),
        suspendedAt: _optionalDate(json['suspendedAt']),
        expiredAt: _optionalDate(json['expiredAt']),
        cancelledAt: _optionalDate(json['cancelledAt']),
        plan: SubscriptionPlan.fromJson(_requiredMap(json, 'plan')),
        version: _requiredInt(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final TenantSubscriptionStatus status;
  final DateTime startsAt;
  final DateTime? endsAt;
  final DateTime? suspendedAt;
  final DateTime? expiredAt;
  final DateTime? cancelledAt;
  final SubscriptionPlan plan;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class TenantSubscriptionEvent {
  const TenantSubscriptionEvent({
    required this.id,
    required this.tenantId,
    required this.subscriptionId,
    required this.eventType,
    required this.newStatus,
    required this.newPlan,
    required this.occurredAt,
    this.previousStatus,
    this.previousPlan,
    this.reason,
  });

  factory TenantSubscriptionEvent.fromJson(Map<String, dynamic> json) =>
      TenantSubscriptionEvent(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        subscriptionId: _requiredString(json, 'subscriptionId'),
        eventType: _requiredString(json, 'eventType'),
        previousStatus: json['previousStatus']?.toString(),
        newStatus: _requiredString(json, 'newStatus'),
        previousPlan: _optionalPlanSummary(json['previousPlan']),
        newPlan: SubscriptionPlanSummary.fromJson(
          _requiredMap(json, 'newPlan'),
        ),
        reason: json['reason']?.toString(),
        occurredAt: _date(json, 'occurredAt'),
      );

  final String id;
  final String tenantId;
  final String subscriptionId;
  final String eventType;
  final String? previousStatus;
  final String newStatus;
  final SubscriptionPlanSummary? previousPlan;
  final SubscriptionPlanSummary newPlan;
  final String? reason;
  final DateTime occurredAt;
}

class TenantEntitlementOverride {
  const TenantEntitlementOverride({
    required this.id,
    required this.isEnabled,
    required this.active,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.limitValue,
    this.metadata,
    this.reason,
    this.effectiveFrom,
    this.effectiveTo,
    this.revokedAt,
  });

  factory TenantEntitlementOverride.fromJson(Map<String, dynamic> json) =>
      TenantEntitlementOverride(
        id: _requiredString(json, 'id'),
        isEnabled: _requiredBool(json, 'isEnabled'),
        limitValue: _optionalInt(json['limitValue']),
        metadata: _mapOrNull(json['metadata']),
        reason: json['reason']?.toString(),
        effectiveFrom: _optionalDate(json['effectiveFrom']),
        effectiveTo: _optionalDate(json['effectiveTo']),
        revokedAt: _optionalDate(json['revokedAt']),
        active: _requiredBool(json, 'active'),
        version: _requiredInt(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final bool isEnabled;
  final int? limitValue;
  final Map<String, dynamic>? metadata;
  final String? reason;
  final DateTime? effectiveFrom;
  final DateTime? effectiveTo;
  final DateTime? revokedAt;
  final bool active;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class TenantEntitlement {
  const TenantEntitlement({
    required this.tenantId,
    required this.featureKey,
    required this.enabled,
    required this.source,
    this.limitValue,
    this.metadata,
    this.subscription,
    this.override,
  });

  factory TenantEntitlement.fromJson(Map<String, dynamic> json) =>
      TenantEntitlement(
        tenantId: _requiredString(json, 'tenantId'),
        featureKey: _requiredString(json, 'featureKey'),
        enabled: _requiredBool(json, 'enabled'),
        source: _requiredString(json, 'source'),
        limitValue: _optionalInt(json['limitValue']),
        metadata: _mapOrNull(json['metadata']),
        subscription: _mapOrNull(json['subscription']) == null
            ? null
            : TenantEntitlementSubscription.fromJson(
                _mapOrNull(json['subscription'])!,
              ),
        override: _mapOrNull(json['override']) == null
            ? null
            : TenantEntitlementOverride.fromJson(_mapOrNull(json['override'])!),
      );

  final String tenantId;
  final String featureKey;
  final bool enabled;
  final String source;
  final int? limitValue;
  final Map<String, dynamic>? metadata;
  final TenantEntitlementSubscription? subscription;
  final TenantEntitlementOverride? override;
}

class TenantEntitlementSubscription {
  const TenantEntitlementSubscription({
    required this.id,
    required this.status,
    required this.startsAt,
    required this.plan,
    this.endsAt,
  });

  factory TenantEntitlementSubscription.fromJson(Map<String, dynamic> json) =>
      TenantEntitlementSubscription(
        id: _requiredString(json, 'id'),
        status: _requiredString(json, 'status'),
        startsAt: _date(json, 'startsAt'),
        endsAt: _optionalDate(json['endsAt']),
        plan: SubscriptionPlanSummary.fromJson(_requiredMap(json, 'plan')),
      );

  final String id;
  final String status;
  final DateTime startsAt;
  final DateTime? endsAt;
  final SubscriptionPlanSummary plan;
}

class UsageCounter {
  const UsageCounter({
    required this.id,
    required this.tenantId,
    required this.featureKey,
    required this.period,
    required this.periodKey,
    required this.periodStart,
    required this.usageValue,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.periodEnd,
  });

  factory UsageCounter.fromJson(Map<String, dynamic> json) => UsageCounter(
    id: _requiredString(json, 'id'),
    tenantId: _requiredString(json, 'tenantId'),
    featureKey: _requiredString(json, 'featureKey'),
    period: UsageCounterPeriod.fromJson(json['period']),
    periodKey: _requiredString(json, 'periodKey'),
    periodStart: _date(json, 'periodStart'),
    periodEnd: _optionalDate(json['periodEnd']),
    usageValue: _requiredString(json, 'usageValue'),
    version: _requiredInt(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String featureKey;
  final UsageCounterPeriod period;
  final String periodKey;
  final DateTime periodStart;
  final DateTime? periodEnd;
  final String usageValue;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class UsageLimitEvaluation {
  const UsageLimitEvaluation({
    required this.tenantId,
    required this.featureKey,
    required this.entitlementEnabled,
    required this.entitlementSource,
    required this.period,
    required this.periodKey,
    required this.periodStart,
    required this.usageValue,
    required this.limitReached,
    required this.overLimit,
    required this.limitAction,
    required this.canConsume,
    this.periodEnd,
    this.limitValue,
    this.remainingValue,
    this.counterId,
    this.version,
    this.createdAt,
    this.updatedAt,
  });

  factory UsageLimitEvaluation.fromJson(Map<String, dynamic> json) =>
      UsageLimitEvaluation(
        tenantId: _requiredString(json, 'tenantId'),
        featureKey: _requiredString(json, 'featureKey'),
        entitlementEnabled: _requiredBool(json, 'entitlementEnabled'),
        entitlementSource: _requiredString(json, 'entitlementSource'),
        period: UsageCounterPeriod.fromJson(json['period']),
        periodKey: _requiredString(json, 'periodKey'),
        periodStart: _date(json, 'periodStart'),
        periodEnd: _optionalDate(json['periodEnd']),
        usageValue: _requiredString(json, 'usageValue'),
        limitValue: json['limitValue']?.toString(),
        remainingValue: json['remainingValue']?.toString(),
        limitReached: _requiredBool(json, 'limitReached'),
        overLimit: _requiredBool(json, 'overLimit'),
        limitAction: UsageLimitAction.fromJson(json['limitAction']),
        canConsume: _requiredBool(json, 'canConsume'),
        counterId: json['counterId']?.toString(),
        version: _optionalInt(json['version']),
        createdAt: _optionalDate(json['createdAt']),
        updatedAt: _optionalDate(json['updatedAt']),
      );

  final String tenantId;
  final String featureKey;
  final bool entitlementEnabled;
  final String entitlementSource;
  final UsageCounterPeriod period;
  final String periodKey;
  final DateTime periodStart;
  final DateTime? periodEnd;
  final String usageValue;
  final String? limitValue;
  final String? remainingValue;
  final bool limitReached;
  final bool overLimit;
  final UsageLimitAction limitAction;
  final bool canConsume;
  final String? counterId;
  final int? version;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

class TrialSubscription {
  const TrialSubscription({
    required this.id,
    required this.tenantId,
    required this.subscriptionId,
    required this.status,
    required this.startsAt,
    required this.endsAt,
    required this.extendedCount,
    required this.plan,
    required this.subscription,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.expiredAt,
    this.convertedAt,
    this.convertedPlan,
  });

  factory TrialSubscription.fromJson(Map<String, dynamic> json) =>
      TrialSubscription(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        subscriptionId: _requiredString(json, 'subscriptionId'),
        status: TrialSubscriptionStatus.fromJson(json['status']),
        startsAt: _date(json, 'startsAt'),
        endsAt: _date(json, 'endsAt'),
        extendedCount: _requiredInt(json, 'extendedCount'),
        expiredAt: _optionalDate(json['expiredAt']),
        convertedAt: _optionalDate(json['convertedAt']),
        plan: SubscriptionPlanSummary.fromJson(_requiredMap(json, 'plan')),
        convertedPlan: _optionalPlanSummary(json['convertedPlan']),
        subscription: TrialLinkedSubscription.fromJson(
          _requiredMap(json, 'subscription'),
        ),
        version: _requiredInt(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String subscriptionId;
  final TrialSubscriptionStatus status;
  final DateTime startsAt;
  final DateTime endsAt;
  final int extendedCount;
  final DateTime? expiredAt;
  final DateTime? convertedAt;
  final SubscriptionPlanSummary plan;
  final SubscriptionPlanSummary? convertedPlan;
  final TrialLinkedSubscription subscription;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class TrialLinkedSubscription {
  const TrialLinkedSubscription({
    required this.id,
    required this.status,
    required this.startsAt,
    required this.plan,
    this.endsAt,
    this.expiredAt,
  });

  factory TrialLinkedSubscription.fromJson(Map<String, dynamic> json) =>
      TrialLinkedSubscription(
        id: _requiredString(json, 'id'),
        status: _requiredString(json, 'status'),
        startsAt: _date(json, 'startsAt'),
        endsAt: _optionalDate(json['endsAt']),
        expiredAt: _optionalDate(json['expiredAt']),
        plan: SubscriptionPlanSummary.fromJson(_requiredMap(json, 'plan')),
      );

  final String id;
  final String status;
  final DateTime startsAt;
  final DateTime? endsAt;
  final DateTime? expiredAt;
  final SubscriptionPlanSummary plan;
}

class TrialSubscriptionEvent {
  const TrialSubscriptionEvent({
    required this.id,
    required this.tenantId,
    required this.trialId,
    required this.subscriptionId,
    required this.eventType,
    required this.newStatus,
    required this.newPlan,
    required this.occurredAt,
    this.previousStatus,
    this.previousEndsAt,
    this.newEndsAt,
    this.previousPlan,
    this.reason,
  });

  factory TrialSubscriptionEvent.fromJson(Map<String, dynamic> json) =>
      TrialSubscriptionEvent(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        trialId: _requiredString(json, 'trialId'),
        subscriptionId: _requiredString(json, 'subscriptionId'),
        eventType: _requiredString(json, 'eventType'),
        previousStatus: json['previousStatus']?.toString(),
        newStatus: _requiredString(json, 'newStatus'),
        previousEndsAt: _optionalDate(json['previousEndsAt']),
        newEndsAt: _optionalDate(json['newEndsAt']),
        previousPlan: _optionalPlanSummary(json['previousPlan']),
        newPlan: SubscriptionPlanSummary.fromJson(
          _requiredMap(json, 'newPlan'),
        ),
        reason: json['reason']?.toString(),
        occurredAt: _date(json, 'occurredAt'),
      );

  final String id;
  final String tenantId;
  final String trialId;
  final String subscriptionId;
  final String eventType;
  final String? previousStatus;
  final String newStatus;
  final DateTime? previousEndsAt;
  final DateTime? newEndsAt;
  final SubscriptionPlanSummary? previousPlan;
  final SubscriptionPlanSummary newPlan;
  final String? reason;
  final DateTime occurredAt;
}

class ExpireDueTrialsResult {
  const ExpireDueTrialsResult({
    required this.processed,
    required this.expired,
    required this.data,
  });

  factory ExpireDueTrialsResult.fromJson(Map<String, dynamic> json) =>
      ExpireDueTrialsResult(
        processed: _requiredInt(json, 'processed'),
        expired: _requiredInt(json, 'expired'),
        data: _mapList(
          json['data'],
        ).map(TrialSubscription.fromJson).toList(growable: false),
      );

  final int processed;
  final int expired;
  final List<TrialSubscription> data;
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Expected a non-empty string for "$key".');
}

int _requiredInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  throw FormatException('Expected an integer for "$key".');
}

int? _optionalInt(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  throw const FormatException('Expected an integer or null.');
}

bool _requiredBool(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is bool) return value;
  throw FormatException('Expected a boolean for "$key".');
}

DateTime _date(Map<String, dynamic> json, String key) =>
    DateTime.parse(_requiredString(json, key)).toUtc();

DateTime? _optionalDate(Object? value) =>
    value == null ? null : DateTime.parse(value.toString()).toUtc();

Map<String, dynamic> _requiredMap(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is Map) return Map<String, dynamic>.from(value);
  throw FormatException('Expected an object for "$key".');
}

Map<String, dynamic>? _mapOrNull(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : null;

List<Map<String, dynamic>> _mapList(Object? value) =>
    (value as List<dynamic>? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);

SubscriptionPlanSummary? _optionalPlanSummary(Object? value) => value is Map
    ? SubscriptionPlanSummary.fromJson(Map<String, dynamic>.from(value))
    : null;
