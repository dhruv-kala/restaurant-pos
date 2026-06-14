enum DiscountPolicyStatus {
  active,
  inactive;

  factory DiscountPolicyStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => DiscountPolicyStatus.active,
    'INACTIVE' => DiscountPolicyStatus.inactive,
    _ => throw FormatException('Unsupported discount policy status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum DiscountScope {
  bill,
  item,
  category;

  factory DiscountScope.fromJson(Object? value) => switch (value) {
    'BILL' => DiscountScope.bill,
    'ITEM' => DiscountScope.item,
    'CATEGORY' => DiscountScope.category,
    _ => throw FormatException('Unsupported discount scope: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum PromotionDiscountValueType {
  percentage,
  fixedAmount;

  factory PromotionDiscountValueType.fromJson(Object? value) => switch (value) {
    'PERCENTAGE' => PromotionDiscountValueType.percentage,
    'FIXED_AMOUNT' => PromotionDiscountValueType.fixedAmount,
    _ => throw FormatException('Unsupported discount value type: $value'),
  };

  String get wireName => switch (this) {
    PromotionDiscountValueType.percentage => 'PERCENTAGE',
    PromotionDiscountValueType.fixedAmount => 'FIXED_AMOUNT',
  };
}

enum CouponStatus {
  active,
  inactive;

  factory CouponStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => CouponStatus.active,
    'INACTIVE' => CouponStatus.inactive,
    _ => throw FormatException('Unsupported coupon status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum CouponType {
  percentage,
  fixedAmount,
  freeItem,
  category,
  item;

  factory CouponType.fromJson(Object? value) => switch (value) {
    'PERCENTAGE' => CouponType.percentage,
    'FIXED_AMOUNT' => CouponType.fixedAmount,
    'FREE_ITEM' => CouponType.freeItem,
    'CATEGORY' => CouponType.category,
    'ITEM' => CouponType.item,
    _ => throw FormatException('Unsupported coupon type: $value'),
  };

  String get wireName => switch (this) {
    CouponType.percentage => 'PERCENTAGE',
    CouponType.fixedAmount => 'FIXED_AMOUNT',
    CouponType.freeItem => 'FREE_ITEM',
    CouponType.category => 'CATEGORY',
    CouponType.item => 'ITEM',
  };
}

enum PromotionCampaignStatus {
  draft,
  active,
  inactive;

  factory PromotionCampaignStatus.fromJson(Object? value) => switch (value) {
    'DRAFT' => PromotionCampaignStatus.draft,
    'ACTIVE' => PromotionCampaignStatus.active,
    'INACTIVE' => PromotionCampaignStatus.inactive,
    _ => throw FormatException('Unsupported campaign status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum PromotionCampaignOutletScope {
  allOutlets,
  selectedOutlets;

  factory PromotionCampaignOutletScope.fromJson(Object? value) =>
      switch (value) {
        'ALL_OUTLETS' => PromotionCampaignOutletScope.allOutlets,
        'SELECTED_OUTLETS' => PromotionCampaignOutletScope.selectedOutlets,
        _ => throw FormatException('Unsupported campaign outlet scope: $value'),
      };

  String get wireName => switch (this) {
    PromotionCampaignOutletScope.allOutlets => 'ALL_OUTLETS',
    PromotionCampaignOutletScope.selectedOutlets => 'SELECTED_OUTLETS',
  };
}

enum PromotionRuleType {
  percentage,
  fixedAmount,
  freeItem,
  category,
  item;

  factory PromotionRuleType.fromJson(Object? value) => switch (value) {
    'PERCENTAGE' => PromotionRuleType.percentage,
    'FIXED_AMOUNT' => PromotionRuleType.fixedAmount,
    'FREE_ITEM' => PromotionRuleType.freeItem,
    'CATEGORY' => PromotionRuleType.category,
    'ITEM' => PromotionRuleType.item,
    _ => throw FormatException('Unsupported promotion rule type: $value'),
  };

  String get wireName => switch (this) {
    PromotionRuleType.percentage => 'PERCENTAGE',
    PromotionRuleType.fixedAmount => 'FIXED_AMOUNT',
    PromotionRuleType.freeItem => 'FREE_ITEM',
    PromotionRuleType.category => 'CATEGORY',
    PromotionRuleType.item => 'ITEM',
  };
}

enum PromotionRedemptionSource {
  coupon,
  campaignRule,
  discountPolicy;

  factory PromotionRedemptionSource.fromJson(Object? value) => switch (value) {
    'COUPON' => PromotionRedemptionSource.coupon,
    'CAMPAIGN_RULE' => PromotionRedemptionSource.campaignRule,
    'DISCOUNT_POLICY' => PromotionRedemptionSource.discountPolicy,
    _ => throw FormatException('Unsupported redemption source: $value'),
  };

  String get wireName => switch (this) {
    PromotionRedemptionSource.coupon => 'COUPON',
    PromotionRedemptionSource.campaignRule => 'CAMPAIGN_RULE',
    PromotionRedemptionSource.discountPolicy => 'DISCOUNT_POLICY',
  };
}

class DiscountPolicy {
  const DiscountPolicy({
    required this.id,
    required this.tenantId,
    required this.code,
    required this.name,
    required this.scope,
    required this.valueType,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.outletId,
    this.description,
    this.percentageBps,
    this.amountMinor,
    this.currencyCode,
    this.maxDiscountMinor,
    this.startsAt,
    this.endsAt,
    this.requiresManagerApproval = false,
  });

  factory DiscountPolicy.fromJson(Map<String, dynamic> json) => DiscountPolicy(
    id: _requiredString(json, 'id'),
    tenantId: _requiredString(json, 'tenantId'),
    outletId: json['outletId']?.toString(),
    code: _requiredString(json, 'code'),
    name: _requiredString(json, 'name'),
    description: json['description']?.toString(),
    scope: DiscountScope.fromJson(json['scope']),
    valueType: PromotionDiscountValueType.fromJson(json['valueType']),
    percentageBps: _optionalInt(json['percentageBps']),
    amountMinor: _optionalInt(json['amountMinor']),
    currencyCode: json['currencyCode']?.toString(),
    maxDiscountMinor: _optionalInt(json['maxDiscountMinor']),
    startsAt: _optionalDate(json['startsAt']),
    endsAt: _optionalDate(json['endsAt']),
    requiresManagerApproval:
        _optionalBool(json['requiresManagerApproval']) ?? false,
    status: DiscountPolicyStatus.fromJson(json['status']),
    version: _requiredInt(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String? outletId;
  final String code;
  final String name;
  final String? description;
  final DiscountScope scope;
  final PromotionDiscountValueType valueType;
  final int? percentageBps;
  final int? amountMinor;
  final String? currencyCode;
  final int? maxDiscountMinor;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final bool requiresManagerApproval;
  final DiscountPolicyStatus status;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class Coupon {
  const Coupon({
    required this.id,
    required this.tenantId,
    required this.code,
    required this.name,
    required this.couponType,
    required this.status,
    required this.currentUsageCount,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.outletId,
    this.description,
    this.discountPolicyId,
    this.valueType,
    this.percentageBps,
    this.amountMinor,
    this.currencyCode,
    this.maxDiscountMinor,
    this.targetMenuCategoryId,
    this.targetMenuItemId,
    this.freeItemMenuItemId,
    this.startsAt,
    this.endsAt,
    this.totalUsageLimit,
    this.perCustomerUsageLimit,
    this.metadata,
  });

  factory Coupon.fromJson(Map<String, dynamic> json) => Coupon(
    id: _requiredString(json, 'id'),
    tenantId: _requiredString(json, 'tenantId'),
    outletId: json['outletId']?.toString(),
    code: _requiredString(json, 'code'),
    name: _requiredString(json, 'name'),
    description: json['description']?.toString(),
    couponType: CouponType.fromJson(json['couponType']),
    status: CouponStatus.fromJson(json['status']),
    discountPolicyId: json['discountPolicyId']?.toString(),
    valueType: json['valueType'] == null
        ? null
        : PromotionDiscountValueType.fromJson(json['valueType']),
    percentageBps: _optionalInt(json['percentageBps']),
    amountMinor: _optionalInt(json['amountMinor']),
    currencyCode: json['currencyCode']?.toString(),
    maxDiscountMinor: _optionalInt(json['maxDiscountMinor']),
    targetMenuCategoryId: json['targetMenuCategoryId']?.toString(),
    targetMenuItemId: json['targetMenuItemId']?.toString(),
    freeItemMenuItemId: json['freeItemMenuItemId']?.toString(),
    startsAt: _optionalDate(json['startsAt']),
    endsAt: _optionalDate(json['endsAt']),
    totalUsageLimit: _optionalInt(json['totalUsageLimit']),
    perCustomerUsageLimit: _optionalInt(json['perCustomerUsageLimit']),
    currentUsageCount: _requiredInt(json, 'currentUsageCount'),
    metadata: _mapOrNull(json['metadata']),
    version: _requiredInt(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String tenantId;
  final String? outletId;
  final String code;
  final String name;
  final String? description;
  final CouponType couponType;
  final CouponStatus status;
  final String? discountPolicyId;
  final PromotionDiscountValueType? valueType;
  final int? percentageBps;
  final int? amountMinor;
  final String? currencyCode;
  final int? maxDiscountMinor;
  final String? targetMenuCategoryId;
  final String? targetMenuItemId;
  final String? freeItemMenuItemId;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final int? totalUsageLimit;
  final int? perCustomerUsageLimit;
  final int currentUsageCount;
  final Map<String, dynamic>? metadata;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class PromotionRuleInput {
  const PromotionRuleInput({
    required this.ruleType,
    required this.name,
    this.description,
    this.discountPolicyId,
    this.valueType,
    this.percentageBps,
    this.amountMinor,
    this.currencyCode,
    this.maxDiscountMinor,
    this.minimumSubtotalMinor,
    this.targetMenuCategoryId,
    this.targetMenuItemId,
    this.freeItemMenuItemId,
    this.priority = 100,
    this.isActive = true,
    this.metadata,
  });

  final PromotionRuleType ruleType;
  final String name;
  final String? description;
  final String? discountPolicyId;
  final PromotionDiscountValueType? valueType;
  final int? percentageBps;
  final int? amountMinor;
  final String? currencyCode;
  final int? maxDiscountMinor;
  final int? minimumSubtotalMinor;
  final String? targetMenuCategoryId;
  final String? targetMenuItemId;
  final String? freeItemMenuItemId;
  final int priority;
  final bool isActive;
  final Map<String, dynamic>? metadata;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'ruleType': ruleType.wireName,
    'name': name,
    if (description?.isNotEmpty ?? false) 'description': description,
    if (discountPolicyId?.isNotEmpty ?? false)
      'discountPolicyId': discountPolicyId,
    if (valueType != null) 'valueType': valueType!.wireName,
    if (percentageBps != null) 'percentageBps': percentageBps,
    if (amountMinor != null) 'amountMinor': amountMinor,
    if (currencyCode?.isNotEmpty ?? false) 'currencyCode': currencyCode,
    if (maxDiscountMinor != null) 'maxDiscountMinor': maxDiscountMinor,
    if (minimumSubtotalMinor != null)
      'minimumSubtotalMinor': minimumSubtotalMinor,
    if (targetMenuCategoryId?.isNotEmpty ?? false)
      'targetMenuCategoryId': targetMenuCategoryId,
    if (targetMenuItemId?.isNotEmpty ?? false)
      'targetMenuItemId': targetMenuItemId,
    if (freeItemMenuItemId?.isNotEmpty ?? false)
      'freeItemMenuItemId': freeItemMenuItemId,
    'priority': priority,
    'isActive': isActive,
    if (metadata != null) 'metadata': metadata,
  };
}

class PromotionRule {
  const PromotionRule({
    required this.id,
    required this.campaignId,
    required this.ruleType,
    required this.name,
    required this.priority,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.discountPolicyId,
    this.valueType,
    this.percentageBps,
    this.amountMinor,
    this.currencyCode,
    this.maxDiscountMinor,
    this.minimumSubtotalMinor,
    this.targetMenuCategoryId,
    this.targetMenuItemId,
    this.freeItemMenuItemId,
    this.metadata,
  });

  factory PromotionRule.fromJson(Map<String, dynamic> json) => PromotionRule(
    id: _requiredString(json, 'id'),
    campaignId: _requiredString(json, 'campaignId'),
    ruleType: PromotionRuleType.fromJson(json['ruleType']),
    name: _requiredString(json, 'name'),
    description: json['description']?.toString(),
    discountPolicyId: json['discountPolicyId']?.toString(),
    valueType: json['valueType'] == null
        ? null
        : PromotionDiscountValueType.fromJson(json['valueType']),
    percentageBps: _optionalInt(json['percentageBps']),
    amountMinor: _optionalInt(json['amountMinor']),
    currencyCode: json['currencyCode']?.toString(),
    maxDiscountMinor: _optionalInt(json['maxDiscountMinor']),
    minimumSubtotalMinor: _optionalInt(json['minimumSubtotalMinor']),
    targetMenuCategoryId: json['targetMenuCategoryId']?.toString(),
    targetMenuItemId: json['targetMenuItemId']?.toString(),
    freeItemMenuItemId: json['freeItemMenuItemId']?.toString(),
    priority: _requiredInt(json, 'priority'),
    isActive: _optionalBool(json['isActive']) ?? true,
    metadata: _mapOrNull(json['metadata']),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final String campaignId;
  final PromotionRuleType ruleType;
  final String name;
  final String? description;
  final String? discountPolicyId;
  final PromotionDiscountValueType? valueType;
  final int? percentageBps;
  final int? amountMinor;
  final String? currencyCode;
  final int? maxDiscountMinor;
  final int? minimumSubtotalMinor;
  final String? targetMenuCategoryId;
  final String? targetMenuItemId;
  final String? freeItemMenuItemId;
  final int priority;
  final bool isActive;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class PromotionCampaign {
  const PromotionCampaign({
    required this.id,
    required this.tenantId,
    required this.code,
    required this.name,
    required this.status,
    required this.outletScope,
    required this.outletIds,
    required this.startsAt,
    required this.endsAt,
    required this.priority,
    required this.rules,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.metadata,
  });

  factory PromotionCampaign.fromJson(Map<String, dynamic> json) =>
      PromotionCampaign(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        code: _requiredString(json, 'code'),
        name: _requiredString(json, 'name'),
        description: json['description']?.toString(),
        status: PromotionCampaignStatus.fromJson(json['status']),
        outletScope: PromotionCampaignOutletScope.fromJson(json['outletScope']),
        outletIds: _stringList(json['outletIds']),
        startsAt: _date(json, 'startsAt'),
        endsAt: _date(json, 'endsAt'),
        priority: _requiredInt(json, 'priority'),
        metadata: _mapOrNull(json['metadata']),
        rules: _mapList(
          json['rules'],
        ).map(PromotionRule.fromJson).toList(growable: false),
        version: _requiredInt(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String code;
  final String name;
  final String? description;
  final PromotionCampaignStatus status;
  final PromotionCampaignOutletScope outletScope;
  final List<String> outletIds;
  final DateTime startsAt;
  final DateTime endsAt;
  final int priority;
  final Map<String, dynamic>? metadata;
  final List<PromotionRule> rules;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class DiscountEligibilityItem {
  const DiscountEligibilityItem({
    required this.quantity,
    required this.unitPriceMinor,
    this.menuItemId,
    this.categoryId,
    this.lineTotalMinor,
  });

  final String? menuItemId;
  final String? categoryId;
  final int quantity;
  final int unitPriceMinor;
  final int? lineTotalMinor;

  Map<String, dynamic> toJson() => <String, dynamic>{
    if (menuItemId?.isNotEmpty ?? false) 'menuItemId': menuItemId,
    if (categoryId?.isNotEmpty ?? false) 'categoryId': categoryId,
    'quantity': quantity,
    'unitPriceMinor': unitPriceMinor,
    if (lineTotalMinor != null) 'lineTotalMinor': lineTotalMinor,
  };
}

class DiscountCalculation {
  const DiscountCalculation({
    required this.baseAmountMinor,
    required this.discountAmountMinor,
    required this.finalAmountMinor,
    required this.currencyCode,
    this.valueType,
    this.percentageBps,
    this.amountMinor,
    this.maxDiscountMinor,
  });

  factory DiscountCalculation.fromJson(Map<String, dynamic> json) =>
      DiscountCalculation(
        baseAmountMinor: _requiredInt(json, 'baseAmountMinor'),
        discountAmountMinor: _requiredInt(json, 'discountAmountMinor'),
        finalAmountMinor: _requiredInt(json, 'finalAmountMinor'),
        currencyCode: _requiredString(json, 'currencyCode'),
        valueType: json['valueType'] == null
            ? null
            : PromotionDiscountValueType.fromJson(json['valueType']),
        percentageBps: _optionalInt(json['percentageBps']),
        amountMinor: _optionalInt(json['amountMinor']),
        maxDiscountMinor: _optionalInt(json['maxDiscountMinor']),
      );

  final int baseAmountMinor;
  final int discountAmountMinor;
  final int finalAmountMinor;
  final String currencyCode;
  final PromotionDiscountValueType? valueType;
  final int? percentageBps;
  final int? amountMinor;
  final int? maxDiscountMinor;
}

class DiscountEligibilityCandidate {
  const DiscountEligibilityCandidate({
    required this.source,
    required this.id,
    required this.code,
    required this.name,
    required this.eligible,
    required this.selected,
    required this.reasons,
    required this.priority,
    this.parentId,
    this.calculation,
    this.snapshot,
  });

  factory DiscountEligibilityCandidate.fromJson(Map<String, dynamic> json) =>
      DiscountEligibilityCandidate(
        source: PromotionRedemptionSource.fromJson(json['source']),
        id: _requiredString(json, 'id'),
        parentId: json['parentId']?.toString(),
        code: _requiredString(json, 'code'),
        name: _requiredString(json, 'name'),
        eligible: _requiredBool(json, 'eligible'),
        selected: _requiredBool(json, 'selected'),
        reasons: _stringList(json['reasons']),
        priority: _requiredInt(json, 'priority'),
        calculation: json['calculation'] == null
            ? null
            : DiscountCalculation.fromJson(_requiredMap(json, 'calculation')),
        snapshot: _mapOrNull(json['snapshot']),
      );

  final PromotionRedemptionSource source;
  final String id;
  final String? parentId;
  final String code;
  final String name;
  final bool eligible;
  final bool selected;
  final List<String> reasons;
  final int priority;
  final DiscountCalculation? calculation;
  final Map<String, dynamic>? snapshot;
}

class DiscountEligibilityResponse {
  const DiscountEligibilityResponse({
    required this.eligible,
    required this.selected,
    required this.rejected,
    required this.candidates,
    required this.stacking,
    required this.context,
    required this.createsRedemption,
  });

  factory DiscountEligibilityResponse.fromJson(Map<String, dynamic> json) =>
      DiscountEligibilityResponse(
        eligible: _mapList(
          json['eligible'],
        ).map(DiscountEligibilityCandidate.fromJson).toList(growable: false),
        selected: _mapList(
          json['selected'],
        ).map(DiscountEligibilityCandidate.fromJson).toList(growable: false),
        rejected: _mapList(
          json['rejected'],
        ).map(DiscountEligibilityCandidate.fromJson).toList(growable: false),
        candidates: _mapList(
          json['candidates'],
        ).map(DiscountEligibilityCandidate.fromJson).toList(growable: false),
        stacking: json['stacking']?.toString() ?? 'BEST_SINGLE_DISCOUNT',
        context: _requiredMap(json, 'context'),
        createsRedemption: _optionalBool(json['createsRedemption']) ?? false,
      );

  final List<DiscountEligibilityCandidate> eligible;
  final List<DiscountEligibilityCandidate> selected;
  final List<DiscountEligibilityCandidate> rejected;
  final List<DiscountEligibilityCandidate> candidates;
  final String stacking;
  final Map<String, dynamic> context;
  final bool createsRedemption;
}

class PromotionRedemption {
  const PromotionRedemption({
    required this.id,
    required this.tenantId,
    required this.billId,
    required this.source,
    required this.codeSnapshot,
    required this.nameSnapshot,
    required this.discountAmountMinor,
    required this.currencyCode,
    required this.baseAmountMinor,
    required this.finalAmountMinor,
    required this.redeemedAt,
    required this.createdAt,
    this.outletId,
    this.orderId,
    this.customerId,
    this.couponId,
    this.campaignId,
    this.promotionRuleId,
    this.discountPolicyId,
    this.metadata,
    this.snapshot,
  });

  factory PromotionRedemption.fromJson(Map<String, dynamic> json) =>
      PromotionRedemption(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        outletId: json['outletId']?.toString(),
        billId: _requiredString(json, 'billId'),
        orderId: json['orderId']?.toString(),
        customerId: json['customerId']?.toString(),
        source: PromotionRedemptionSource.fromJson(json['source']),
        couponId: json['couponId']?.toString(),
        campaignId: json['campaignId']?.toString(),
        promotionRuleId: json['promotionRuleId']?.toString(),
        discountPolicyId: json['discountPolicyId']?.toString(),
        codeSnapshot: _requiredString(json, 'codeSnapshot'),
        nameSnapshot: _requiredString(json, 'nameSnapshot'),
        discountAmountMinor: _requiredInt(json, 'discountAmountMinor'),
        currencyCode: _requiredString(json, 'currencyCode'),
        baseAmountMinor: _requiredInt(json, 'baseAmountMinor'),
        finalAmountMinor: _requiredInt(json, 'finalAmountMinor'),
        snapshot: _mapOrNull(json['snapshot']),
        metadata: _mapOrNull(json['metadata']),
        redeemedAt: _date(json, 'redeemedAt'),
        createdAt: _date(json, 'createdAt'),
      );

  final String id;
  final String tenantId;
  final String? outletId;
  final String billId;
  final String? orderId;
  final String? customerId;
  final PromotionRedemptionSource source;
  final String? couponId;
  final String? campaignId;
  final String? promotionRuleId;
  final String? discountPolicyId;
  final String codeSnapshot;
  final String nameSnapshot;
  final int discountAmountMinor;
  final String currencyCode;
  final int baseAmountMinor;
  final int finalAmountMinor;
  final Map<String, dynamic>? snapshot;
  final Map<String, dynamic>? metadata;
  final DateTime redeemedAt;
  final DateTime createdAt;
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) {
    return value;
  }
  throw FormatException('Expected a non-empty string for "$key".');
}

int _requiredInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  final parsed = _optionalInt(value);
  if (parsed != null) {
    return parsed;
  }
  throw FormatException('Expected an integer for "$key".');
}

int? _optionalInt(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(value.toString());
}

bool _requiredBool(Map<String, dynamic> json, String key) {
  final value = _optionalBool(json[key]);
  if (value != null) {
    return value;
  }
  throw FormatException('Expected a boolean for "$key".');
}

bool? _optionalBool(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is bool) {
    return value;
  }
  if (value is String) {
    return switch (value.toLowerCase()) {
      'true' => true,
      'false' => false,
      _ => null,
    };
  }
  return null;
}

DateTime _date(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) {
    return DateTime.parse(value).toUtc();
  }
  throw FormatException('Expected an ISO-8601 date string for "$key".');
}

DateTime? _optionalDate(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is String && value.isNotEmpty) {
    return DateTime.parse(value).toUtc();
  }
  return null;
}

Map<String, dynamic> _requiredMap(Map<String, dynamic> json, String key) {
  final value = _mapOrNull(json[key]);
  if (value != null) {
    return value;
  }
  throw FormatException('Expected an object for "$key".');
}

Map<String, dynamic>? _mapOrNull(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return null;
}

List<Map<String, dynamic>> _mapList(Object? value) =>
    (value as List<dynamic>? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);

List<String> _stringList(Object? value) => (value as List<dynamic>? ?? const [])
    .map((item) => item.toString())
    .toList(growable: false);
