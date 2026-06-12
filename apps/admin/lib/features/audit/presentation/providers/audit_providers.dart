import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/audit_repository.dart';
import '../../domain/audit_query.dart';

final auditApiServiceProvider = Provider<AuditApiService>(
  (ref) => AuditApiService(ref.watch(dioProvider)),
);
final auditRepositoryProvider = Provider<AuditRepository>(
  (ref) => AuditRepository(ref.watch(auditApiServiceProvider)),
);
final auditEventsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<AuditEvent>, AuditQuery>(
      (ref, query) => ref.watch(auditRepositoryProvider).events(query),
    );
final auditEventProvider = FutureProvider.autoDispose
    .family<AuditEvent, String>(
      (ref, id) => ref.watch(auditRepositoryProvider).event(id),
    );
