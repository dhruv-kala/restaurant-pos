import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/promotions_query.dart';

class PromotionsRepository {
  const PromotionsRepository(this._api);
  final PromotionsApiService _api;

  Future<PaginatedResponse<DiscountPolicy>> discountPolicies(
    DiscountPolicyQuery query,
  ) => _api.getDiscountPolicies(
    tenantId: query.tenantId,
    outletId: query.outletId,
    page: query.page,
    limit: query.limit,
    status: query.status,
    scope: query.scope,
    search: query.search,
  );

  Future<DiscountPolicy> createDiscountPolicy({
    required String code,
    required String name,
    required DiscountScope scope,
    required PromotionDiscountValueType valueType,
    String? tenantId,
    String? outletId,
    String? description,
    int? percentageBps,
    int? amountMinor,
    String? currencyCode,
    int? maxDiscountMinor,
  }) => _api.createDiscountPolicy(
    tenantId: tenantId,
    outletId: outletId,
    code: code,
    name: name,
    description: description,
    scope: scope,
    valueType: valueType,
    percentageBps: percentageBps,
    amountMinor: amountMinor,
    currencyCode: currencyCode,
    maxDiscountMinor: maxDiscountMinor,
  );

  Future<DiscountPolicy> changeDiscountPolicyStatus(
    DiscountPolicy policy,
    DiscountPolicyStatus status,
  ) => _api.updateDiscountPolicy(
    id: policy.id,
    tenantId: policy.tenantId,
    version: policy.version,
    status: status,
  );

  Future<PaginatedResponse<Coupon>> coupons(CouponQuery query) =>
      _api.getCoupons(
        tenantId: query.tenantId,
        outletId: query.outletId,
        page: query.page,
        limit: query.limit,
        status: query.status,
        couponType: query.couponType,
        search: query.search,
      );

  Future<Coupon> createCoupon({
    required String code,
    required String name,
    required CouponType couponType,
    String? tenantId,
    String? outletId,
    String? description,
    PromotionDiscountValueType? valueType,
    int? percentageBps,
    int? amountMinor,
    String? currencyCode,
    int? totalUsageLimit,
    int? perCustomerUsageLimit,
  }) => _api.createCoupon(
    tenantId: tenantId,
    outletId: outletId,
    code: code,
    name: name,
    description: description,
    couponType: couponType,
    valueType: valueType,
    percentageBps: percentageBps,
    amountMinor: amountMinor,
    currencyCode: currencyCode,
    totalUsageLimit: totalUsageLimit,
    perCustomerUsageLimit: perCustomerUsageLimit,
  );

  Future<Coupon> changeCouponStatus(Coupon coupon, CouponStatus status) =>
      _api.updateCoupon(
        id: coupon.id,
        tenantId: coupon.tenantId,
        version: coupon.version,
        status: status,
      );

  Future<PaginatedResponse<PromotionCampaign>> campaigns(
    PromotionCampaignQuery query,
  ) => _api.getCampaigns(
    tenantId: query.tenantId,
    outletId: query.outletId,
    page: query.page,
    limit: query.limit,
    status: query.status,
    search: query.search,
  );

  Future<PromotionCampaign> createCampaign({
    required String code,
    required String name,
    required DateTime startsAt,
    required DateTime endsAt,
    required List<PromotionRuleInput> rules,
    String? tenantId,
    String? description,
    int priority = 100,
  }) => _api.createCampaign(
    tenantId: tenantId,
    code: code,
    name: name,
    description: description,
    outletScope: PromotionCampaignOutletScope.allOutlets,
    startsAt: startsAt,
    endsAt: endsAt,
    priority: priority,
    rules: rules,
  );

  Future<PromotionCampaign> activateCampaign(PromotionCampaign campaign) =>
      _api.activateCampaign(
        id: campaign.id,
        tenantId: campaign.tenantId,
        version: campaign.version,
      );

  Future<PromotionCampaign> deactivateCampaign(PromotionCampaign campaign) =>
      _api.deactivateCampaign(
        id: campaign.id,
        tenantId: campaign.tenantId,
        version: campaign.version,
      );

  Future<DiscountEligibilityResponse> preview(DiscountPreviewRequest request) =>
      _api.evaluateEligibility(
        tenantId: request.tenantId,
        outletId: request.outletId,
        subtotalMinor: request.subtotalMinor,
        currencyCode: request.currencyCode,
        couponCodes: request.couponCodes,
        discountPolicyIds: request.discountPolicyIds,
        campaignIds: request.campaignIds,
      );

  Future<PaginatedResponse<PromotionRedemption>> redemptions(
    PromotionRedemptionQuery query,
  ) => _api.getRedemptions(
    tenantId: query.tenantId,
    outletId: query.outletId,
    page: query.page,
    limit: query.limit,
    source: query.source,
  );
}
