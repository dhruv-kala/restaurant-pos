import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class AuditApiService {
  const AuditApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<AuditEvent>> getEvents({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    String? actorUserId,
    String? action,
    String? targetType,
    String? targetId,
    AuditResult? result,
    String? correlationId,
    DateTime? from,
    DateTime? to,
    String? search,
  }) async => PaginatedResponse<AuditEvent>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.auditEvents,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (tenantId != null) 'tenantId': tenantId,
          if (outletId != null) 'outletId': outletId,
          if (actorUserId != null) 'actorUserId': actorUserId,
          if (action?.isNotEmpty ?? false) 'action': action,
          if (targetType?.isNotEmpty ?? false) 'targetType': targetType,
          if (targetId?.isNotEmpty ?? false) 'targetId': targetId,
          if (result != null) 'result': result.wireName,
          if (correlationId?.isNotEmpty ?? false)
            'correlationId': correlationId,
          if (from != null) 'from': from.toUtc().toIso8601String(),
          if (to != null) 'to': to.toUtc().toIso8601String(),
          if (search?.isNotEmpty ?? false) 'search': search,
        },
      ),
    ),
    AuditEvent.fromJson,
  );

  Future<AuditEvent> getEvent(String id) async => AuditEvent.fromJson(
    _map(await _dio.get<Object?>(ApiEndpoints.auditEvent(id))),
  );

  Future<AuditExportRequest> requestExport({
    required AuditExportFormat format,
    required Map<String, dynamic> filters,
  }) async => AuditExportRequest.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.auditExport,
        data: {'format': format.wireName, 'filters': filters},
      ),
    ),
  );
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}
