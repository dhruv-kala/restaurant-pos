import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/audit_query.dart';

class AuditRepository {
  const AuditRepository(this._api);
  final AuditApiService _api;

  Future<PaginatedResponse<AuditEvent>> events(AuditQuery query) =>
      _api.getEvents(
        page: query.page,
        limit: query.limit,
        tenantId: query.tenantId,
        outletId: query.outletId,
        actorUserId: query.actorUserId,
        action: query.action,
        targetType: query.targetType,
        targetId: query.targetId,
        result: query.result,
        correlationId: query.correlationId,
        from: query.from,
        to: query.to,
        search: query.search,
      );

  Future<AuditEvent> event(String id) => _api.getEvent(id);

  Future<AuditExportRequest> requestExport(
    AuditQuery query,
    AuditExportFormat format,
  ) => _api.requestExport(format: format, filters: query.toJson());
}
