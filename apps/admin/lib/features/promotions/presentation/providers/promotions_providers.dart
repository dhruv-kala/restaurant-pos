import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/promotions_repository.dart';
import '../../domain/promotions_query.dart';

final promotionsApiServiceProvider = Provider<PromotionsApiService>(
  (ref) => PromotionsApiService(ref.watch(dioProvider)),
);

final promotionsRepositoryProvider = Provider<PromotionsRepository>(
  (ref) => PromotionsRepository(ref.watch(promotionsApiServiceProvider)),
);

final discountPoliciesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<DiscountPolicy>, DiscountPolicyQuery>(
      (ref, query) =>
          ref.watch(promotionsRepositoryProvider).discountPolicies(query),
    );

final couponsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Coupon>, CouponQuery>(
      (ref, query) => ref.watch(promotionsRepositoryProvider).coupons(query),
    );

final promotionCampaignsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<PromotionCampaign>, PromotionCampaignQuery>(
      (ref, query) => ref.watch(promotionsRepositoryProvider).campaigns(query),
    );

final promotionRedemptionsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<PromotionRedemption>, PromotionRedemptionQuery>(
      (ref, query) =>
          ref.watch(promotionsRepositoryProvider).redemptions(query),
    );

final discountPreviewProvider = FutureProvider.autoDispose
    .family<DiscountEligibilityResponse, DiscountPreviewRequest>(
      (ref, request) =>
          ref.watch(promotionsRepositoryProvider).preview(request),
    );
