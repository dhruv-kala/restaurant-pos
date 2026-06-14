import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class DiscountPolicyQuery {
  const DiscountPolicyQuery({
    this.tenantId,
    this.outletId,
    this.page = 1,
    this.limit = 50,
    this.status,
    this.scope,
    this.search,
  });

  final String? tenantId;
  final String? outletId;
  final int page;
  final int limit;
  final DiscountPolicyStatus? status;
  final DiscountScope? scope;
  final String? search;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DiscountPolicyQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          page == other.page &&
          limit == other.limit &&
          status == other.status &&
          scope == other.scope &&
          search == other.search;

  @override
  int get hashCode =>
      Object.hash(tenantId, outletId, page, limit, status, scope, search);
}

class CouponQuery {
  const CouponQuery({
    this.tenantId,
    this.outletId,
    this.page = 1,
    this.limit = 50,
    this.status,
    this.couponType,
    this.search,
  });

  final String? tenantId;
  final String? outletId;
  final int page;
  final int limit;
  final CouponStatus? status;
  final CouponType? couponType;
  final String? search;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CouponQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          page == other.page &&
          limit == other.limit &&
          status == other.status &&
          couponType == other.couponType &&
          search == other.search;

  @override
  int get hashCode =>
      Object.hash(tenantId, outletId, page, limit, status, couponType, search);
}

class PromotionCampaignQuery {
  const PromotionCampaignQuery({
    this.tenantId,
    this.outletId,
    this.page = 1,
    this.limit = 50,
    this.status,
    this.search,
  });

  final String? tenantId;
  final String? outletId;
  final int page;
  final int limit;
  final PromotionCampaignStatus? status;
  final String? search;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PromotionCampaignQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          page == other.page &&
          limit == other.limit &&
          status == other.status &&
          search == other.search;

  @override
  int get hashCode =>
      Object.hash(tenantId, outletId, page, limit, status, search);
}

class PromotionRedemptionQuery {
  const PromotionRedemptionQuery({
    this.tenantId,
    this.outletId,
    this.page = 1,
    this.limit = 50,
    this.source,
  });

  final String? tenantId;
  final String? outletId;
  final int page;
  final int limit;
  final PromotionRedemptionSource? source;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PromotionRedemptionQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          page == other.page &&
          limit == other.limit &&
          source == other.source;

  @override
  int get hashCode => Object.hash(tenantId, outletId, page, limit, source);
}

class DiscountPreviewRequest {
  const DiscountPreviewRequest({
    required this.subtotalMinor,
    required this.currencyCode,
    this.tenantId,
    this.outletId,
    this.couponCodes = const <String>[],
    this.discountPolicyIds = const <String>[],
    this.campaignIds = const <String>[],
  });

  final String? tenantId;
  final String? outletId;
  final int subtotalMinor;
  final String currencyCode;
  final List<String> couponCodes;
  final List<String> discountPolicyIds;
  final List<String> campaignIds;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DiscountPreviewRequest &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          subtotalMinor == other.subtotalMinor &&
          currencyCode == other.currencyCode &&
          _sameList(couponCodes, other.couponCodes) &&
          _sameList(discountPolicyIds, other.discountPolicyIds) &&
          _sameList(campaignIds, other.campaignIds);

  @override
  int get hashCode => Object.hash(
    tenantId,
    outletId,
    subtotalMinor,
    currencyCode,
    Object.hashAll(couponCodes),
    Object.hashAll(discountPolicyIds),
    Object.hashAll(campaignIds),
  );
}

bool _sameList(List<String> left, List<String> right) {
  if (left.length != right.length) {
    return false;
  }
  for (var index = 0; index < left.length; index += 1) {
    if (left[index] != right[index]) {
      return false;
    }
  }
  return true;
}
