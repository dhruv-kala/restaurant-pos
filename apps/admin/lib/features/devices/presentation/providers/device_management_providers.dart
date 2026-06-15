import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../../audit/domain/audit_query.dart';
import '../../../audit/presentation/providers/audit_providers.dart';
import '../../data/device_management_repository.dart';
import '../../domain/device_query.dart';

final deviceManagementApiServiceProvider = Provider<DeviceManagementApiService>(
  (ref) => DeviceManagementApiService(ref.watch(dioProvider)),
);

final deviceManagementRepositoryProvider = Provider<DeviceManagementRepository>(
  (ref) =>
      DeviceManagementRepository(ref.watch(deviceManagementApiServiceProvider)),
);

final devicesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Device>, DeviceQuery>(
      (ref, query) =>
          ref.watch(deviceManagementRepositoryProvider).devices(query),
    );

final deviceEnrollmentsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<DeviceEnrollment>, DeviceEnrollmentQuery>(
      (ref, query) =>
          ref.watch(deviceManagementRepositoryProvider).enrollments(query),
    );

final trustedSessionsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TrustedDeviceSession>, TrustedSessionQuery>(
      (ref, query) =>
          ref.watch(deviceManagementRepositoryProvider).trustedSessions(query),
    );

final terminalsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Terminal>, TerminalQuery>(
      (ref, query) =>
          ref.watch(deviceManagementRepositoryProvider).terminals(query),
    );

final deviceAssignmentsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<DeviceAssignment>, DeviceAssignmentQuery>(
      (ref, query) =>
          ref.watch(deviceManagementRepositoryProvider).assignments(query),
    );

final securityPoliciesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<DeviceSecurityPolicy>, SecurityPolicyQuery>(
      (ref, query) =>
          ref.watch(deviceManagementRepositoryProvider).securityPolicies(query),
    );

final deviceAuditEventsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<AuditEvent>, DeviceAuditQuery>(
      (ref, query) => ref
          .watch(auditRepositoryProvider)
          .events(
            AuditQuery(
              tenantId: query.tenantId,
              outletId: query.outletId,
              targetType: query.targetType,
              page: query.page,
              limit: query.limit,
            ),
          ),
    );
