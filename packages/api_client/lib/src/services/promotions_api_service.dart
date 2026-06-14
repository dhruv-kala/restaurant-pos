import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class PromotionsApiService {
  const PromotionsApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<DiscountPolicy>> getDiscountPolicies({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    DiscountPolicyStatus? status,
    DiscountScope? scope,
    String? search,
  }) async => PaginatedResponse<DiscountPolicy>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.promotionDiscountPolicies,
        queryParameters: _query(<String, Object?>{
          'page': page,
          'limit': limit,
          'tenantId': tenantId,
          'outletId': outletId,
          'status': status?.wireName,
          'scope': scope?.wireName,
          'search': search,
        }),
      ),
    ),
    DiscountPolicy.fromJson,
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
    DateTime? startsAt,
    DateTime? endsAt,
    bool requiresManagerApproval = false,
  }) async => DiscountPolicy.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.promotionDiscountPolicies,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'outletId': outletId,
          'code': code,
          'name': name,
          'description': description,
          'scope': scope.wireName,
          'valueType': valueType.wireName,
          'percentageBps': percentageBps,
          'amountMinor': amountMinor,
          'currencyCode': currencyCode,
          'maxDiscountMinor': maxDiscountMinor,
          'startsAt': startsAt?.toUtc().toIso8601String(),
          'endsAt': endsAt?.toUtc().toIso8601String(),
          'requiresManagerApproval': requiresManagerApproval,
        }),
      ),
    ),
  );

  Future<DiscountPolicy> updateDiscountPolicy({
    required String id,
    required int version,
    String? tenantId,
    String? outletId,
    String? name,
    String? description,
    DiscountScope? scope,
    PromotionDiscountValueType? valueType,
    int? percentageBps,
    int? amountMinor,
    String? currencyCode,
    int? maxDiscountMinor,
    DateTime? startsAt,
    DateTime? endsAt,
    bool? requiresManagerApproval,
    DiscountPolicyStatus? status,
  }) async => DiscountPolicy.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.promotionDiscountPolicy(id),
        queryParameters: _query(<String, Object?>{'tenantId': tenantId}),
        data: _payload(<String, Object?>{
          'version': version,
          'outletId': outletId,
          'name': name,
          'description': description,
          'scope': scope?.wireName,
          'valueType': valueType?.wireName,
          'percentageBps': percentageBps,
          'amountMinor': amountMinor,
          'currencyCode': currencyCode,
          'maxDiscountMinor': maxDiscountMinor,
          'startsAt': startsAt?.toUtc().toIso8601String(),
          'endsAt': endsAt?.toUtc().toIso8601String(),
          'requiresManagerApproval': requiresManagerApproval,
          'status': status?.wireName,
        }),
      ),
    ),
  );

  Future<PaginatedResponse<Coupon>> getCoupons({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    CouponStatus? status,
    CouponType? couponType,
    String? search,
  }) async => PaginatedResponse<Coupon>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.promotionCoupons,
        queryParameters: _query(<String, Object?>{
          'page': page,
          'limit': limit,
          'tenantId': tenantId,
          'outletId': outletId,
          'status': status?.wireName,
          'couponType': couponType?.wireName,
          'search': search,
        }),
      ),
    ),
    Coupon.fromJson,
  );

  Future<Coupon> createCoupon({
    required String code,
    required String name,
    required CouponType couponType,
    String? tenantId,
    String? outletId,
    String? description,
    String? discountPolicyId,
    PromotionDiscountValueType? valueType,
    int? percentageBps,
    int? amountMinor,
    String? currencyCode,
    int? maxDiscountMinor,
    DateTime? startsAt,
    DateTime? endsAt,
    int? totalUsageLimit,
    int? perCustomerUsageLimit,
  }) async => Coupon.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.promotionCoupons,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'outletId': outletId,
          'code': code,
          'name': name,
          'description': description,
          'couponType': couponType.wireName,
          'discountPolicyId': discountPolicyId,
          'valueType': valueType?.wireName,
          'percentageBps': percentageBps,
          'amountMinor': amountMinor,
          'currencyCode': currencyCode,
          'maxDiscountMinor': maxDiscountMinor,
          'startsAt': startsAt?.toUtc().toIso8601String(),
          'endsAt': endsAt?.toUtc().toIso8601String(),
          'totalUsageLimit': totalUsageLimit,
          'perCustomerUsageLimit': perCustomerUsageLimit,
        }),
      ),
    ),
  );

  Future<Coupon> updateCoupon({
    required String id,
    required int version,
    String? tenantId,
    String? outletId,
    String? name,
    String? description,
    CouponStatus? status,
    String? discountPolicyId,
    PromotionDiscountValueType? valueType,
    int? percentageBps,
    int? amountMinor,
    String? currencyCode,
    int? maxDiscountMinor,
    DateTime? startsAt,
    DateTime? endsAt,
    int? totalUsageLimit,
    int? perCustomerUsageLimit,
  }) async => Coupon.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.promotionCoupon(id),
        queryParameters: _query(<String, Object?>{'tenantId': tenantId}),
        data: _payload(<String, Object?>{
          'version': version,
          'outletId': outletId,
          'name': name,
          'description': description,
          'status': status?.wireName,
          'discountPolicyId': discountPolicyId,
          'valueType': valueType?.wireName,
          'percentageBps': percentageBps,
          'amountMinor': amountMinor,
          'currencyCode': currencyCode,
          'maxDiscountMinor': maxDiscountMinor,
          'startsAt': startsAt?.toUtc().toIso8601String(),
          'endsAt': endsAt?.toUtc().toIso8601String(),
          'totalUsageLimit': totalUsageLimit,
          'perCustomerUsageLimit': perCustomerUsageLimit,
        }),
      ),
    ),
  );

  Future<PaginatedResponse<PromotionCampaign>> getCampaigns({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    PromotionCampaignStatus? status,
    String? search,
  }) async => PaginatedResponse<PromotionCampaign>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.promotionCampaigns,
        queryParameters: _query(<String, Object?>{
          'page': page,
          'limit': limit,
          'tenantId': tenantId,
          'outletId': outletId,
          'status': status?.wireName,
          'search': search,
        }),
      ),
    ),
    PromotionCampaign.fromJson,
  );

  Future<PromotionCampaign> createCampaign({
    required String code,
    required String name,
    required PromotionCampaignOutletScope outletScope,
    required DateTime startsAt,
    required DateTime endsAt,
    required List<PromotionRuleInput> rules,
    String? tenantId,
    String? description,
    List<String> outletIds = const <String>[],
    int priority = 100,
  }) async => PromotionCampaign.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.promotionCampaigns,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'code': code,
          'name': name,
          'description': description,
          'outletScope': outletScope.wireName,
          'outletIds': outletIds,
          'startsAt': startsAt.toUtc().toIso8601String(),
          'endsAt': endsAt.toUtc().toIso8601String(),
          'priority': priority,
          'rules': rules.map((rule) => rule.toJson()).toList(),
        }),
      ),
    ),
  );

  Future<PromotionCampaign> updateCampaign({
    required String id,
    required int version,
    String? tenantId,
    String? name,
    String? description,
    PromotionCampaignOutletScope? outletScope,
    List<String>? outletIds,
    DateTime? startsAt,
    DateTime? endsAt,
    int? priority,
    List<PromotionRuleInput>? rules,
  }) async => PromotionCampaign.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.promotionCampaign(id),
        queryParameters: _query(<String, Object?>{'tenantId': tenantId}),
        data: _payload(<String, Object?>{
          'version': version,
          'name': name,
          'description': description,
          'outletScope': outletScope?.wireName,
          'outletIds': outletIds,
          'startsAt': startsAt?.toUtc().toIso8601String(),
          'endsAt': endsAt?.toUtc().toIso8601String(),
          'priority': priority,
          'rules': rules?.map((rule) => rule.toJson()).toList(),
        }),
      ),
    ),
  );

  Future<PromotionCampaign> activateCampaign({
    required String id,
    required int version,
    String? tenantId,
  }) async => PromotionCampaign.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.promotionCampaignActivate(id),
        queryParameters: _query(<String, Object?>{'tenantId': tenantId}),
        data: {'version': version},
      ),
    ),
  );

  Future<PromotionCampaign> deactivateCampaign({
    required String id,
    required int version,
    String? tenantId,
  }) async => PromotionCampaign.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.promotionCampaignDeactivate(id),
        queryParameters: _query(<String, Object?>{'tenantId': tenantId}),
        data: {'version': version},
      ),
    ),
  );

  Future<DiscountEligibilityResponse> evaluateEligibility({
    required int subtotalMinor,
    required String currencyCode,
    String? tenantId,
    String? outletId,
    String? customerId,
    String? orderId,
    String? billId,
    List<String> couponCodes = const <String>[],
    List<String> discountPolicyIds = const <String>[],
    List<String> campaignIds = const <String>[],
    List<DiscountEligibilityItem> items = const <DiscountEligibilityItem>[],
  }) async => DiscountEligibilityResponse.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.promotionEligibility,
        data: _payload(<String, Object?>{
          'tenantId': tenantId,
          'outletId': outletId,
          'customerId': customerId,
          'orderId': orderId,
          'billId': billId,
          'subtotalMinor': subtotalMinor,
          'currencyCode': currencyCode,
          'couponCodes': couponCodes,
          'discountPolicyIds': discountPolicyIds,
          'campaignIds': campaignIds,
          'items': items.map((item) => item.toJson()).toList(),
        }),
      ),
    ),
  );

  Future<PaginatedResponse<PromotionRedemption>> getRedemptions({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    String? billId,
    String? orderId,
    String? customerId,
    String? couponId,
    String? campaignId,
    PromotionRedemptionSource? source,
  }) async => PaginatedResponse<PromotionRedemption>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.promotionRedemptions,
        queryParameters: _query(<String, Object?>{
          'page': page,
          'limit': limit,
          'tenantId': tenantId,
          'outletId': outletId,
          'billId': billId,
          'orderId': orderId,
          'customerId': customerId,
          'couponId': couponId,
          'campaignId': campaignId,
          'source': source?.wireName,
        }),
      ),
    ),
    PromotionRedemption.fromJson,
  );
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}

Map<String, Object?> _query(Map<String, Object?> values) {
  return Map<String, Object?>.fromEntries(
    values.entries.where((entry) {
      final value = entry.value;
      return value != null && (value is! String || value.isNotEmpty);
    }),
  );
}

Map<String, Object?> _payload(Map<String, Object?> values) {
  return Map<String, Object?>.fromEntries(
    values.entries.where((entry) {
      final value = entry.value;
      if (value == null) {
        return false;
      }
      if (value is String) {
        return value.isNotEmpty;
      }
      if (value is Iterable) {
        return value.isNotEmpty;
      }
      return true;
    }),
  );
}
