enum AuditResult {
  success,
  denied,
  failed;

  factory AuditResult.fromJson(Object? value) => switch (value) {
    'SUCCESS' => AuditResult.success,
    'DENIED' => AuditResult.denied,
    'FAILED' => AuditResult.failed,
    _ => throw FormatException('Unsupported audit result: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum AuditExportFormat {
  csv,
  json;

  String get wireName => name.toUpperCase();
}

class AuditEvent {
  const AuditEvent({
    required this.id,
    required this.sequence,
    required this.scopeKey,
    required this.actorRoles,
    required this.action,
    required this.targetType,
    required this.result,
    required this.occurredAt,
    required this.eventHash,
    this.tenantId,
    this.outletId,
    this.actorUserId,
    this.effectiveUserId,
    this.impersonatorUserId,
    this.targetId,
    this.reason,
    this.changes,
    this.metadata,
    this.correlationId,
    this.idempotencyKey,
    this.ipAddress,
    this.userAgent,
    this.previousHash,
  });

  factory AuditEvent.fromJson(Map<String, dynamic> json) => AuditEvent(
    id: _requiredString(json, 'id'),
    sequence: _requiredString(json, 'sequence'),
    scopeKey: _requiredString(json, 'scopeKey'),
    tenantId: json['tenantId']?.toString(),
    outletId: json['outletId']?.toString(),
    actorUserId: json['actorUserId']?.toString(),
    effectiveUserId: json['effectiveUserId']?.toString(),
    impersonatorUserId: json['impersonatorUserId']?.toString(),
    actorRoles: (json['actorRoles'] as List<dynamic>? ?? const [])
        .map((role) => role.toString())
        .toList(growable: false),
    action: _requiredString(json, 'action'),
    targetType: _requiredString(json, 'targetType'),
    targetId: json['targetId']?.toString(),
    result: AuditResult.fromJson(json['result']),
    reason: json['reason']?.toString(),
    changes: _mapOrNull(json['changes']),
    metadata: _mapOrNull(json['metadata']),
    correlationId: json['correlationId']?.toString(),
    idempotencyKey: json['idempotencyKey']?.toString(),
    ipAddress: json['ipAddress']?.toString(),
    userAgent: json['userAgent']?.toString(),
    occurredAt: DateTime.parse(_requiredString(json, 'occurredAt')).toUtc(),
    previousHash: json['previousHash']?.toString(),
    eventHash: _requiredString(json, 'eventHash'),
  );

  final String id;
  final String sequence;
  final String scopeKey;
  final String? tenantId;
  final String? outletId;
  final String? actorUserId;
  final String? effectiveUserId;
  final String? impersonatorUserId;
  final List<String> actorRoles;
  final String action;
  final String targetType;
  final String? targetId;
  final AuditResult result;
  final String? reason;
  final Map<String, dynamic>? changes;
  final Map<String, dynamic>? metadata;
  final String? correlationId;
  final String? idempotencyKey;
  final String? ipAddress;
  final String? userAgent;
  final DateTime occurredAt;
  final String? previousHash;
  final String eventHash;
}

class AuditExportRequest {
  const AuditExportRequest({
    required this.auditId,
    required this.format,
    required this.status,
    required this.requestedAt,
    required this.message,
  });

  factory AuditExportRequest.fromJson(Map<String, dynamic> json) =>
      AuditExportRequest(
        auditId: _requiredString(json, 'auditId'),
        format: json['format']?.toString() ?? '',
        status: _requiredString(json, 'status'),
        requestedAt: DateTime.parse(
          _requiredString(json, 'requestedAt'),
        ).toUtc(),
        message: _requiredString(json, 'message'),
      );

  final String auditId;
  final String format;
  final String status;
  final DateTime requestedAt;
  final String message;
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) throw FormatException('Missing "$key".');
  final text = value.toString();
  if (text.isEmpty) throw FormatException('Expected "$key".');
  return text;
}

Map<String, dynamic>? _mapOrNull(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : null;
