enum SyncQueueState {
  pending,
  inProgress,
  success,
  failed,
  conflict,
  retrying;

  factory SyncQueueState.fromJson(Object? value) => switch (value) {
    'PENDING' => SyncQueueState.pending,
    'IN_PROGRESS' => SyncQueueState.inProgress,
    'SUCCESS' => SyncQueueState.success,
    'FAILED' => SyncQueueState.failed,
    'CONFLICT' => SyncQueueState.conflict,
    'RETRYING' => SyncQueueState.retrying,
    _ => throw FormatException('Unsupported sync queue state: $value'),
  };

  String get wireName => switch (this) {
    SyncQueueState.pending => 'PENDING',
    SyncQueueState.inProgress => 'IN_PROGRESS',
    SyncQueueState.success => 'SUCCESS',
    SyncQueueState.failed => 'FAILED',
    SyncQueueState.conflict => 'CONFLICT',
    SyncQueueState.retrying => 'RETRYING',
  };
}

enum SyncOperationType {
  create,
  update,
  delete,
  lifecycle,
  append;

  factory SyncOperationType.fromJson(Object? value) => switch (value) {
    'CREATE' => SyncOperationType.create,
    'UPDATE' => SyncOperationType.update,
    'DELETE' => SyncOperationType.delete,
    'LIFECYCLE' => SyncOperationType.lifecycle,
    'APPEND' => SyncOperationType.append,
    _ => throw FormatException('Unsupported sync operation type: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum SyncConflictStatus {
  open,
  resolved,
  ignored;

  factory SyncConflictStatus.fromJson(Object? value) => switch (value) {
    'OPEN' => SyncConflictStatus.open,
    'RESOLVED' => SyncConflictStatus.resolved,
    'IGNORED' => SyncConflictStatus.ignored,
    _ => throw FormatException('Unsupported sync conflict status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum SyncConflictResolutionStrategy {
  businessRule,
  serverAuthority,
  manualReview,
  lastWriteWins;

  factory SyncConflictResolutionStrategy.fromJson(Object? value) =>
      switch (value) {
        'BUSINESS_RULE' => SyncConflictResolutionStrategy.businessRule,
        'SERVER_AUTHORITY' => SyncConflictResolutionStrategy.serverAuthority,
        'MANUAL_REVIEW' => SyncConflictResolutionStrategy.manualReview,
        'LAST_WRITE_WINS' => SyncConflictResolutionStrategy.lastWriteWins,
        _ => throw FormatException(
          'Unsupported sync conflict resolution strategy: $value',
        ),
      };

  String get wireName => switch (this) {
    SyncConflictResolutionStrategy.businessRule => 'BUSINESS_RULE',
    SyncConflictResolutionStrategy.serverAuthority => 'SERVER_AUTHORITY',
    SyncConflictResolutionStrategy.manualReview => 'MANUAL_REVIEW',
    SyncConflictResolutionStrategy.lastWriteWins => 'LAST_WRITE_WINS',
  };
}

enum OfflinePaymentVerificationMode {
  manual,
  gateway,
  offline;

  factory OfflinePaymentVerificationMode.fromJson(Object? value) =>
      switch (value) {
        'MANUAL' => OfflinePaymentVerificationMode.manual,
        'GATEWAY' => OfflinePaymentVerificationMode.gateway,
        'OFFLINE' => OfflinePaymentVerificationMode.offline,
        _ => throw FormatException(
          'Unsupported offline payment verification mode: $value',
        ),
      };

  String get wireName => name.toUpperCase();
}

enum OfflinePaymentVerificationStatus {
  pending,
  verified,
  failed;

  factory OfflinePaymentVerificationStatus.fromJson(Object? value) =>
      switch (value) {
        'PENDING' => OfflinePaymentVerificationStatus.pending,
        'VERIFIED' => OfflinePaymentVerificationStatus.verified,
        'FAILED' => OfflinePaymentVerificationStatus.failed,
        _ => throw FormatException(
          'Unsupported offline payment verification status: $value',
        ),
      };

  String get wireName => name.toUpperCase();
}

class OfflineIdentifier {
  const OfflineIdentifier({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.createdAt,
  });

  factory OfflineIdentifier.fromJson(Map<String, dynamic> json) =>
      OfflineIdentifier(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        deviceId: _string(json, 'deviceId'),
        createdAt: _date(json, 'createdAt'),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'tenantId': tenantId,
    'outletId': outletId,
    'deviceId': deviceId,
    'createdAt': createdAt.toUtc().toIso8601String(),
  };
}

class DeviceSyncState {
  const DeviceSyncState({
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.userId,
    required this.syncEnabled,
    required this.isOnline,
    required this.pendingCount,
    required this.failedCount,
    required this.conflictCount,
    required this.updatedAt,
    this.trustedSessionId,
    this.lastPullCursor,
    this.lastPushedAt,
    this.lastPulledAt,
  });

  factory DeviceSyncState.fromJson(Map<String, dynamic> json) =>
      DeviceSyncState(
        tenantId: _string(json, 'tenantId'),
        outletId: _string(json, 'outletId'),
        deviceId: _string(json, 'deviceId'),
        userId: _string(json, 'userId'),
        trustedSessionId: json['trustedSessionId']?.toString(),
        syncEnabled: _bool(json, 'syncEnabled'),
        isOnline: _bool(json, 'isOnline'),
        lastPullCursor: json['lastPullCursor']?.toString(),
        lastPushedAt: _optionalDate(json['lastPushedAt']),
        lastPulledAt: _optionalDate(json['lastPulledAt']),
        pendingCount: _int(json, 'pendingCount'),
        failedCount: _int(json, 'failedCount'),
        conflictCount: _int(json, 'conflictCount'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String tenantId;
  final String outletId;
  final String deviceId;
  final String userId;
  final String? trustedSessionId;
  final bool syncEnabled;
  final bool isOnline;
  final String? lastPullCursor;
  final DateTime? lastPushedAt;
  final DateTime? lastPulledAt;
  final int pendingCount;
  final int failedCount;
  final int conflictCount;
  final DateTime updatedAt;
}

class SyncQueueItem {
  const SyncQueueItem({
    required this.localId,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.actorUserId,
    required this.module,
    required this.entityType,
    required this.entityId,
    required this.operationType,
    required this.idempotencyKey,
    required this.businessDate,
    required this.occurredAt,
    required this.payload,
    required this.state,
    required this.attemptCount,
    required this.createdAt,
    required this.updatedAt,
    this.baseVersion,
    this.lastAttemptAt,
    this.nextRetryAt,
    this.errorCode,
    this.errorMessage,
  });

  factory SyncQueueItem.fromJson(Map<String, dynamic> json) => SyncQueueItem(
    localId: _string(json, 'localId'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    deviceId: _string(json, 'deviceId'),
    actorUserId: _string(json, 'actorUserId'),
    module: _string(json, 'module'),
    entityType: _string(json, 'entityType'),
    entityId: _string(json, 'entityId'),
    operationType: SyncOperationType.fromJson(json['operationType']),
    idempotencyKey: _string(json, 'idempotencyKey'),
    baseVersion: _optionalInt(json['baseVersion']),
    businessDate: _date(json, 'businessDate'),
    occurredAt: _date(json, 'occurredAt'),
    payload: _map(json['payload']),
    state: SyncQueueState.fromJson(json['state']),
    attemptCount: _int(json, 'attemptCount'),
    lastAttemptAt: _optionalDate(json['lastAttemptAt']),
    nextRetryAt: _optionalDate(json['nextRetryAt']),
    errorCode: json['errorCode']?.toString(),
    errorMessage: json['errorMessage']?.toString(),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String localId;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final String actorUserId;
  final String module;
  final String entityType;
  final String entityId;
  final SyncOperationType operationType;
  final String idempotencyKey;
  final int? baseVersion;
  final DateTime businessDate;
  final DateTime occurredAt;
  final Map<String, dynamic> payload;
  final SyncQueueState state;
  final int attemptCount;
  final DateTime? lastAttemptAt;
  final DateTime? nextRetryAt;
  final String? errorCode;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class SyncBatch {
  const SyncBatch({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.queueItemIds,
    required this.state,
    required this.createdAt,
    this.startedAt,
    this.completedAt,
  });

  factory SyncBatch.fromJson(Map<String, dynamic> json) => SyncBatch(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    deviceId: _string(json, 'deviceId'),
    queueItemIds: _list(
      json['queueItemIds'],
    ).map((value) => value.toString()).toList(growable: false),
    state: SyncQueueState.fromJson(json['state']),
    createdAt: _date(json, 'createdAt'),
    startedAt: _optionalDate(json['startedAt']),
    completedAt: _optionalDate(json['completedAt']),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final List<String> queueItemIds;
  final SyncQueueState state;
  final DateTime createdAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
}

class SyncConflict {
  const SyncConflict({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.queueItemId,
    required this.entityType,
    required this.entityId,
    required this.status,
    required this.detectedAt,
    required this.localPayload,
    required this.serverPayload,
    this.resolutionStrategy,
    this.resolvedByUserId,
    this.resolvedAt,
    this.resolutionNotes,
  });

  factory SyncConflict.fromJson(Map<String, dynamic> json) => SyncConflict(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    deviceId: _string(json, 'deviceId'),
    queueItemId: _string(json, 'queueItemId'),
    entityType: _string(json, 'entityType'),
    entityId: _string(json, 'entityId'),
    status: SyncConflictStatus.fromJson(json['status']),
    resolutionStrategy: json['resolutionStrategy'] == null
        ? null
        : SyncConflictResolutionStrategy.fromJson(json['resolutionStrategy']),
    detectedAt: _date(json, 'detectedAt'),
    resolvedByUserId: json['resolvedByUserId']?.toString(),
    resolvedAt: _optionalDate(json['resolvedAt']),
    resolutionNotes: json['resolutionNotes']?.toString(),
    localPayload: _map(json['localPayload']),
    serverPayload: _map(json['serverPayload']),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String deviceId;
  final String queueItemId;
  final String entityType;
  final String entityId;
  final SyncConflictStatus status;
  final SyncConflictResolutionStrategy? resolutionStrategy;
  final DateTime detectedAt;
  final String? resolvedByUserId;
  final DateTime? resolvedAt;
  final String? resolutionNotes;
  final Map<String, dynamic> localPayload;
  final Map<String, dynamic> serverPayload;
}

class SyncCheckpoint {
  const SyncCheckpoint({
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.module,
    required this.cursor,
    required this.updatedAt,
  });

  factory SyncCheckpoint.fromJson(Map<String, dynamic> json) => SyncCheckpoint(
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    deviceId: _string(json, 'deviceId'),
    module: _string(json, 'module'),
    cursor: _string(json, 'cursor'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String tenantId;
  final String outletId;
  final String deviceId;
  final String module;
  final String cursor;
  final DateTime updatedAt;
}

class SyncPushRequest {
  const SyncPushRequest({
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    required this.items,
  });

  final String tenantId;
  final String outletId;
  final String deviceId;
  final List<SyncQueueItem> items;
}

class SyncPullRequest {
  const SyncPullRequest({
    required this.tenantId,
    required this.outletId,
    required this.deviceId,
    this.cursor,
    this.limit = 200,
  });

  final String tenantId;
  final String outletId;
  final String deviceId;
  final String? cursor;
  final int limit;
}

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return value;
  throw FormatException('Expected string for $key.');
}

int _int(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Expected int for $key.');
}

int? _optionalInt(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return null;
}

bool _bool(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is bool) return value;
  throw FormatException('Expected bool for $key.');
}

DateTime _date(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return DateTime.parse(value);
  throw FormatException('Expected date string for $key.');
}

DateTime? _optionalDate(Object? value) =>
    value is String ? DateTime.parse(value) : null;

List<Object?> _list(Object? value) {
  if (value is List) return value;
  return const <Object?>[];
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  throw const FormatException('Expected object.');
}
