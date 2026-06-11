import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/payments_repository.dart';
import '../../domain/payment_query.dart';

final paymentsApiServiceProvider = Provider<PaymentsApiService>(
  (ref) => PaymentsApiService(ref.watch(dioProvider)),
);
final paymentBillingApiServiceProvider = Provider<BillingApiService>(
  (ref) => BillingApiService(ref.watch(dioProvider)),
);
final paymentsRepositoryProvider = Provider<PaymentsRepository>(
  (ref) => PaymentsRepository(
    ref.watch(paymentsApiServiceProvider),
    ref.watch(paymentBillingApiServiceProvider),
  ),
);
final paymentProvider = FutureProvider.autoDispose.family<Payment, String>(
  (ref, id) => ref.watch(paymentsRepositoryProvider).payment(id),
);
final paymentDetailsProvider = paymentProvider;
final paymentsListProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Payment>, PaymentQuery>(
      (ref, query) => ref.watch(paymentsRepositoryProvider).payments(query),
    );
final paymentBillProvider = FutureProvider.autoDispose.family<Bill, String>(
  (ref, id) => ref.watch(paymentsRepositoryProvider).bill(id),
);
