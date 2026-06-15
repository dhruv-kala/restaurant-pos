import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../../audit/domain/audit_query.dart';
import '../../../audit/presentation/providers/audit_providers.dart';
import '../../data/operations_repository.dart';
import '../../domain/operations_query.dart';

final operationsApiServiceProvider = Provider<OperationsApiService>(
  (ref) => OperationsApiService(ref.watch(dioProvider)),
);

final operationsRepositoryProvider = Provider<OperationsRepository>(
  (ref) => OperationsRepository(ref.watch(operationsApiServiceProvider)),
);

final businessDaysProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<BusinessDay>, BusinessDayQuery>(
      (ref, query) =>
          ref.watch(operationsRepositoryProvider).businessDays(query),
    );

final shiftSessionsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<ShiftSession>, ShiftSessionQuery>(
      (ref, query) =>
          ref.watch(operationsRepositoryProvider).shiftSessions(query),
    );

final cashDrawersProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<CashDrawer>, CashDrawerQuery>(
      (ref, query) =>
          ref.watch(operationsRepositoryProvider).cashDrawers(query),
    );

final shiftReconciliationsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<ShiftReconciliation>, ShiftReconciliationQuery>(
      (ref, query) =>
          ref.watch(operationsRepositoryProvider).shiftReconciliations(query),
    );

final operationAuditEventsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<AuditEvent>, OperationAuditQuery>(
      (ref, query) => ref
          .watch(auditRepositoryProvider)
          .events(
            AuditQuery(
              page: query.page,
              limit: query.limit,
              tenantId: query.tenantId,
              outletId: query.outletId,
              targetType: query.targetType,
            ),
          ),
    );
