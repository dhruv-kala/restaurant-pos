import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class AuditQuery {
  const AuditQuery({
    this.page = 1,
    this.limit = 20,
    this.tenantId,
    this.outletId,
    this.actorUserId,
    this.action,
    this.targetType,
    this.targetId,
    this.result,
    this.correlationId,
    this.from,
    this.to,
    this.search,
  });

  final int page;
  final int limit;
  final String? tenantId;
  final String? outletId;
  final String? actorUserId;
  final String? action;
  final String? targetType;
  final String? targetId;
  final AuditResult? result;
  final String? correlationId;
  final DateTime? from;
  final DateTime? to;
  final String? search;

  AuditQuery copyWith({
    int? page,
    AuditResult? result,
    bool clearResult = false,
    String? search,
  }) => AuditQuery(
    page: page ?? this.page,
    limit: limit,
    tenantId: tenantId,
    outletId: outletId,
    actorUserId: actorUserId,
    action: action,
    targetType: targetType,
    targetId: targetId,
    result: clearResult ? null : result ?? this.result,
    correlationId: correlationId,
    from: from,
    to: to,
    search: search ?? this.search,
  );

  Map<String, dynamic> toJson() => {
    'page': page,
    'limit': limit,
    if (tenantId != null) 'tenantId': tenantId,
    if (outletId != null) 'outletId': outletId,
    if (actorUserId != null) 'actorUserId': actorUserId,
    if (action != null) 'action': action,
    if (targetType != null) 'targetType': targetType,
    if (targetId != null) 'targetId': targetId,
    if (result != null) 'result': result!.wireName,
    if (correlationId != null) 'correlationId': correlationId,
    if (from != null) 'from': from!.toUtc().toIso8601String(),
    if (to != null) 'to': to!.toUtc().toIso8601String(),
    if (search != null) 'search': search,
  };

  @override
  bool operator ==(Object other) =>
      other is AuditQuery &&
      other.page == page &&
      other.limit == limit &&
      other.tenantId == tenantId &&
      other.outletId == outletId &&
      other.actorUserId == actorUserId &&
      other.action == action &&
      other.targetType == targetType &&
      other.targetId == targetId &&
      other.result == result &&
      other.correlationId == correlationId &&
      other.from == from &&
      other.to == to &&
      other.search == search;

  @override
  int get hashCode => Object.hash(
    page,
    limit,
    tenantId,
    outletId,
    actorUserId,
    action,
    targetType,
    targetId,
    result,
    correlationId,
    from,
    to,
    search,
  );
}
