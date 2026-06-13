import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/subscription_repository.dart';
import '../../domain/subscription_query.dart';

final subscriptionApiServiceProvider = Provider<SubscriptionApiService>(
  (ref) => SubscriptionApiService(ref.watch(dioProvider)),
);

final subscriptionRepositoryProvider = Provider<SubscriptionRepository>(
  (ref) => SubscriptionRepository(ref.watch(subscriptionApiServiceProvider)),
);

final subscriptionPlansProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<SubscriptionPlan>, SubscriptionPlanQuery>(
      (ref, query) => ref.watch(subscriptionRepositoryProvider).plans(query),
    );

final activeSubscriptionPlansProvider =
    FutureProvider.autoDispose<List<SubscriptionPlan>>(
      (ref) => ref.watch(subscriptionRepositoryProvider).activePlans(),
    );

final subscriptionPlanVersionsProvider = FutureProvider.autoDispose
    .family<List<SubscriptionPlan>, String>(
      (ref, id) => ref.watch(subscriptionRepositoryProvider).planVersions(id),
    );

final tenantSubscriptionsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TenantSubscription>, TenantSubscriptionQuery>(
      (ref, query) =>
          ref.watch(subscriptionRepositoryProvider).tenantSubscriptions(query),
    );

final currentTenantSubscriptionProvider = FutureProvider.autoDispose
    .family<TenantSubscription, String>(
      (ref, tenantId) => ref
          .watch(subscriptionRepositoryProvider)
          .currentSubscription(tenantId),
    );

final subscriptionHistoryProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TenantSubscriptionEvent>, String>(
      (ref, tenantId) => ref
          .watch(subscriptionRepositoryProvider)
          .subscriptionHistory(tenantId),
    );

final tenantEntitlementsProvider = FutureProvider.autoDispose
    .family<List<TenantEntitlement>, String>(
      (ref, tenantId) =>
          ref.watch(subscriptionRepositoryProvider).entitlements(tenantId),
    );

final tenantUsageCountersProvider = FutureProvider.autoDispose
    .family<List<UsageCounter>, String>(
      (ref, tenantId) =>
          ref.watch(subscriptionRepositoryProvider).usageCounters(tenantId),
    );

final tenantTrialsProvider = FutureProvider.autoDispose
    .family<List<TrialSubscription>, String>(
      (ref, tenantId) =>
          ref.watch(subscriptionRepositoryProvider).trials(tenantId),
    );
