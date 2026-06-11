import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/billing_repository.dart';
import '../../domain/bill_query.dart';

final billingApiServiceProvider = Provider<BillingApiService>(
  (ref) => BillingApiService(ref.watch(dioProvider)),
);
final billingRepositoryProvider = Provider<BillingRepository>(
  (ref) => BillingRepository(ref.watch(billingApiServiceProvider)),
);
final billsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Bill>, BillQuery>(
      (ref, query) => ref.watch(billingRepositoryProvider).bills(query),
    );
final billDetailsProvider = FutureProvider.autoDispose.family<Bill, String>(
  (ref, id) => ref.watch(billingRepositoryProvider).bill(id),
);
final billProvider = billDetailsProvider;
