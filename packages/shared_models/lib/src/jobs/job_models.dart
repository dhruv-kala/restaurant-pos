enum OutboxWorkScope {
  platform,
  tenant;

  factory OutboxWorkScope.fromJson(Object? value) => switch (value) {
    'PLATFORM' => OutboxWorkScope.platform,
    'TENANT' => OutboxWorkScope.tenant,
    _ => throw FormatException('Unsupported outbox work scope: $value'),
  };

  String get wireName => switch (this) {
    OutboxWorkScope.platform => 'PLATFORM',
    OutboxWorkScope.tenant => 'TENANT',
  };
}

enum OutboxEventStatus {
  pending,
  processing,
  processed,
  failed,
  cancelled;

  factory OutboxEventStatus.fromJson(Object? value) => switch (value) {
    'PENDING' => OutboxEventStatus.pending,
    'PROCESSING' => OutboxEventStatus.processing,
    'PROCESSED' => OutboxEventStatus.processed,
    'FAILED' => OutboxEventStatus.failed,
    'CANCELLED' => OutboxEventStatus.cancelled,
    _ => throw FormatException('Unsupported outbox event status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum BackgroundJobStatus {
  pending,
  processing,
  retrying,
  succeeded,
  failed,
  deadLettered,
  cancelled;

  factory BackgroundJobStatus.fromJson(Object? value) => switch (value) {
    'PENDING' => BackgroundJobStatus.pending,
    'PROCESSING' => BackgroundJobStatus.processing,
    'RETRYING' => BackgroundJobStatus.retrying,
    'SUCCEEDED' => BackgroundJobStatus.succeeded,
    'FAILED' => BackgroundJobStatus.failed,
    'DEAD_LETTERED' => BackgroundJobStatus.deadLettered,
    'CANCELLED' => BackgroundJobStatus.cancelled,
    _ => throw FormatException('Unsupported background job status: $value'),
  };

  String get wireName => switch (this) {
    BackgroundJobStatus.deadLettered => 'DEAD_LETTERED',
    _ => name.toUpperCase(),
  };
}

enum BackgroundJobAttemptStatus {
  started,
  succeeded,
  retryableFailed,
  terminalFailed;

  factory BackgroundJobAttemptStatus.fromJson(Object? value) => switch (value) {
    'STARTED' => BackgroundJobAttemptStatus.started,
    'SUCCEEDED' => BackgroundJobAttemptStatus.succeeded,
    'RETRYABLE_FAILED' => BackgroundJobAttemptStatus.retryableFailed,
    'TERMINAL_FAILED' => BackgroundJobAttemptStatus.terminalFailed,
    _ => throw FormatException(
      'Unsupported background job attempt status: $value',
    ),
  };

  String get wireName => switch (this) {
    BackgroundJobAttemptStatus.retryableFailed => 'RETRYABLE_FAILED',
    BackgroundJobAttemptStatus.terminalFailed => 'TERMINAL_FAILED',
    _ => name.toUpperCase(),
  };
}

enum JobDeadLetterStatus {
  open,
  resolved;

  factory JobDeadLetterStatus.fromJson(Object? value) => switch (value) {
    'OPEN' => JobDeadLetterStatus.open,
    'RESOLVED' => JobDeadLetterStatus.resolved,
    _ => throw FormatException('Unsupported dead-letter status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum ScheduledJobStatus {
  active,
  paused,
  disabled;

  factory ScheduledJobStatus.fromJson(Object? value) => switch (value) {
    'ACTIVE' => ScheduledJobStatus.active,
    'PAUSED' => ScheduledJobStatus.paused,
    'DISABLED' => ScheduledJobStatus.disabled,
    _ => throw FormatException('Unsupported scheduled job status: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum ScheduledJobScheduleType {
  interval,
  cron;

  factory ScheduledJobScheduleType.fromJson(Object? value) => switch (value) {
    'INTERVAL' => ScheduledJobScheduleType.interval,
    'CRON' => ScheduledJobScheduleType.cron,
    _ => throw FormatException('Unsupported schedule type: $value'),
  };

  String get wireName => name.toUpperCase();
}

class OutboxEvent {
  const OutboxEvent({
    required this.id,
    required this.scope,
    required this.scopeKey,
    required this.eventType,
    required this.idempotencyKey,
    required this.status,
    required this.redactedPayload,
    required this.availableAt,
    required this.createdAt,
    required this.updatedAt,
    this.tenantId,
    this.outletId,
    this.aggregateType,
    this.aggregateId,
    this.processedAt,
  });

  factory OutboxEvent.fromJson(Map<String, dynamic> json) => OutboxEvent(
    id: _string(json, 'id'),
    scope: OutboxWorkScope.fromJson(json['scope']),
    scopeKey: _string(json, 'scopeKey'),
    tenantId: json['tenantId']?.toString(),
    outletId: json['outletId']?.toString(),
    eventType: _string(json, 'eventType'),
    aggregateType: json['aggregateType']?.toString(),
    aggregateId: json['aggregateId']?.toString(),
    idempotencyKey: _string(json, 'idempotencyKey'),
    redactedPayload: _optionalMap(json['redactedPayload']),
    status: OutboxEventStatus.fromJson(json['status']),
    availableAt: _date(json, 'availableAt'),
    processedAt: _optionalDate(json['processedAt']),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final OutboxWorkScope scope;
  final String scopeKey;
  final String? tenantId;
  final String? outletId;
  final String eventType;
  final String? aggregateType;
  final String? aggregateId;
  final String idempotencyKey;
  final Map<String, dynamic>? redactedPayload;
  final OutboxEventStatus status;
  final DateTime availableAt;
  final DateTime? processedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class BackgroundJob {
  const BackgroundJob({
    required this.id,
    required this.scope,
    required this.scopeKey,
    required this.jobType,
    required this.idempotencyKey,
    required this.redactedPayload,
    required this.status,
    required this.priority,
    required this.attemptCount,
    required this.maxAttempts,
    required this.availableAt,
    required this.createdAt,
    required this.updatedAt,
    this.tenantId,
    this.outletId,
    this.outboxEventId,
    this.aggregateType,
    this.aggregateId,
    this.lockedBy,
    this.lockedUntil,
    this.lastErrorCode,
    this.lastErrorMessage,
  });

  factory BackgroundJob.fromJson(Map<String, dynamic> json) => BackgroundJob(
    id: _string(json, 'id'),
    scope: OutboxWorkScope.fromJson(json['scope']),
    scopeKey: _string(json, 'scopeKey'),
    tenantId: json['tenantId']?.toString(),
    outletId: json['outletId']?.toString(),
    outboxEventId: json['outboxEventId']?.toString(),
    jobType: _string(json, 'jobType'),
    aggregateType: json['aggregateType']?.toString(),
    aggregateId: json['aggregateId']?.toString(),
    idempotencyKey: _string(json, 'idempotencyKey'),
    redactedPayload: _optionalMap(json['redactedPayload']),
    status: BackgroundJobStatus.fromJson(json['status']),
    priority: _int(json, 'priority'),
    attemptCount: _int(json, 'attemptCount'),
    maxAttempts: _int(json, 'maxAttempts'),
    availableAt: _date(json, 'availableAt'),
    lockedBy: json['lockedBy']?.toString(),
    lockedUntil: _optionalDate(json['lockedUntil']),
    lastErrorCode: json['lastErrorCode']?.toString(),
    lastErrorMessage: json['lastErrorMessage']?.toString(),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final OutboxWorkScope scope;
  final String scopeKey;
  final String? tenantId;
  final String? outletId;
  final String? outboxEventId;
  final String jobType;
  final String? aggregateType;
  final String? aggregateId;
  final String idempotencyKey;
  final Map<String, dynamic>? redactedPayload;
  final BackgroundJobStatus status;
  final int priority;
  final int attemptCount;
  final int maxAttempts;
  final DateTime availableAt;
  final String? lockedBy;
  final DateTime? lockedUntil;
  final String? lastErrorCode;
  final String? lastErrorMessage;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class BackgroundJobAttempt {
  const BackgroundJobAttempt({
    required this.id,
    required this.attemptNumber,
    required this.workerId,
    required this.status,
    required this.startedAt,
    this.errorCode,
    this.errorClassification,
    this.errorMessage,
    this.completedAt,
  });

  factory BackgroundJobAttempt.fromJson(Map<String, dynamic> json) =>
      BackgroundJobAttempt(
        id: _string(json, 'id'),
        attemptNumber: _int(json, 'attemptNumber'),
        workerId: _string(json, 'workerId'),
        status: BackgroundJobAttemptStatus.fromJson(json['status']),
        errorCode: json['errorCode']?.toString(),
        errorClassification: json['errorClassification']?.toString(),
        errorMessage: json['errorMessage']?.toString(),
        startedAt: _date(json, 'startedAt'),
        completedAt: _optionalDate(json['completedAt']),
      );

  final String id;
  final int attemptNumber;
  final String workerId;
  final BackgroundJobAttemptStatus status;
  final String? errorCode;
  final String? errorClassification;
  final String? errorMessage;
  final DateTime startedAt;
  final DateTime? completedAt;
}

class BackgroundJobDetail {
  const BackgroundJobDetail({
    required this.job,
    required this.attempts,
    this.deadLetter,
  });

  factory BackgroundJobDetail.fromJson(Map<String, dynamic> json) =>
      BackgroundJobDetail(
        job: BackgroundJob.fromJson(json),
        attempts: _list(json['attempts'], BackgroundJobAttempt.fromJson),
        deadLetter: json['deadLetter'] is Map
            ? JobDeadLetter.fromJson(_map(json['deadLetter']))
            : null,
      );

  final BackgroundJob job;
  final List<BackgroundJobAttempt> attempts;
  final JobDeadLetter? deadLetter;
}

class JobDeadLetter {
  const JobDeadLetter({
    required this.id,
    required this.scope,
    required this.scopeKey,
    required this.jobId,
    required this.status,
    required this.reasonCode,
    required this.failedAt,
    required this.createdAt,
    required this.updatedAt,
    this.tenantId,
    this.outletId,
    this.reasonMessage,
    this.resolvedAt,
    this.resolvedByUserId,
    this.resolutionNote,
  });

  factory JobDeadLetter.fromJson(Map<String, dynamic> json) => JobDeadLetter(
    id: _string(json, 'id'),
    scope: OutboxWorkScope.fromJson(json['scope']),
    scopeKey: _string(json, 'scopeKey'),
    tenantId: json['tenantId']?.toString(),
    outletId: json['outletId']?.toString(),
    jobId: _string(json, 'jobId'),
    status: JobDeadLetterStatus.fromJson(json['status']),
    reasonCode: _string(json, 'reasonCode'),
    reasonMessage: json['reasonMessage']?.toString(),
    failedAt: _date(json, 'failedAt'),
    resolvedAt: _optionalDate(json['resolvedAt']),
    resolvedByUserId: json['resolvedByUserId']?.toString(),
    resolutionNote: json['resolutionNote']?.toString(),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
  );

  final String id;
  final OutboxWorkScope scope;
  final String scopeKey;
  final String? tenantId;
  final String? outletId;
  final String jobId;
  final JobDeadLetterStatus status;
  final String reasonCode;
  final String? reasonMessage;
  final DateTime failedAt;
  final DateTime? resolvedAt;
  final String? resolvedByUserId;
  final String? resolutionNote;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class BackgroundJobRetryPolicy {
  const BackgroundJobRetryPolicy({
    required this.id,
    required this.scope,
    required this.scopeKey,
    required this.jobType,
    required this.maxAttempts,
    required this.initialDelaySeconds,
    required this.maxDelaySeconds,
    required this.backoffMultiplier,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.tenantId,
  });

  factory BackgroundJobRetryPolicy.fromJson(Map<String, dynamic> json) =>
      BackgroundJobRetryPolicy(
        id: _string(json, 'id'),
        scope: OutboxWorkScope.fromJson(json['scope']),
        scopeKey: _string(json, 'scopeKey'),
        tenantId: json['tenantId']?.toString(),
        jobType: _string(json, 'jobType'),
        maxAttempts: _int(json, 'maxAttempts'),
        initialDelaySeconds: _int(json, 'initialDelaySeconds'),
        maxDelaySeconds: _int(json, 'maxDelaySeconds'),
        backoffMultiplier: _int(json, 'backoffMultiplier'),
        version: _int(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final OutboxWorkScope scope;
  final String scopeKey;
  final String? tenantId;
  final String jobType;
  final int maxAttempts;
  final int initialDelaySeconds;
  final int maxDelaySeconds;
  final int backoffMultiplier;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class ScheduledJob {
  const ScheduledJob({
    required this.id,
    required this.scope,
    required this.scopeKey,
    required this.scheduleKey,
    required this.displayName,
    required this.jobType,
    required this.redactedPayload,
    required this.status,
    required this.scheduleType,
    required this.timezone,
    required this.nextRunAt,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.tenantId,
    this.outletId,
    this.description,
    this.cronExpression,
    this.intervalSeconds,
    this.lastRunAt,
    this.runs = const <ScheduledJobRun>[],
  });

  factory ScheduledJob.fromJson(Map<String, dynamic> json) => ScheduledJob(
    id: _string(json, 'id'),
    scope: OutboxWorkScope.fromJson(json['scope']),
    scopeKey: _string(json, 'scopeKey'),
    tenantId: json['tenantId']?.toString(),
    outletId: json['outletId']?.toString(),
    scheduleKey: _string(json, 'scheduleKey'),
    displayName: _string(json, 'displayName'),
    description: json['description']?.toString(),
    jobType: _string(json, 'jobType'),
    redactedPayload: _optionalMap(json['redactedPayload']),
    status: ScheduledJobStatus.fromJson(json['status']),
    scheduleType: ScheduledJobScheduleType.fromJson(json['scheduleType']),
    cronExpression: json['cronExpression']?.toString(),
    intervalSeconds: _optionalInt(json['intervalSeconds']),
    timezone: _string(json, 'timezone'),
    nextRunAt: _date(json, 'nextRunAt'),
    lastRunAt: _optionalDate(json['lastRunAt']),
    version: _int(json, 'version'),
    createdAt: _date(json, 'createdAt'),
    updatedAt: _date(json, 'updatedAt'),
    runs: _list(json['runs'], ScheduledJobRun.fromJson),
  );

  final String id;
  final OutboxWorkScope scope;
  final String scopeKey;
  final String? tenantId;
  final String? outletId;
  final String scheduleKey;
  final String displayName;
  final String? description;
  final String jobType;
  final Map<String, dynamic>? redactedPayload;
  final ScheduledJobStatus status;
  final ScheduledJobScheduleType scheduleType;
  final String? cronExpression;
  final int? intervalSeconds;
  final String timezone;
  final DateTime nextRunAt;
  final DateTime? lastRunAt;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<ScheduledJobRun> runs;
}

class ScheduledJobRun {
  const ScheduledJobRun({
    required this.id,
    required this.scheduledJobId,
    required this.dueAt,
    required this.triggeredAt,
    required this.status,
    required this.idempotencyKey,
    required this.createdAt,
    this.outletId,
    this.backgroundJobId,
    this.failureCode,
  });

  factory ScheduledJobRun.fromJson(Map<String, dynamic> json) =>
      ScheduledJobRun(
        id: _string(json, 'id'),
        scheduledJobId: _string(json, 'scheduledJobId'),
        outletId: json['outletId']?.toString(),
        backgroundJobId: json['backgroundJobId']?.toString(),
        dueAt: _date(json, 'dueAt'),
        triggeredAt: _date(json, 'triggeredAt'),
        status: json['status']?.toString() ?? 'CREATED',
        idempotencyKey: _string(json, 'idempotencyKey'),
        failureCode: json['failureCode']?.toString(),
        createdAt: _date(json, 'createdAt'),
      );

  final String id;
  final String scheduledJobId;
  final String? outletId;
  final String? backgroundJobId;
  final DateTime dueAt;
  final DateTime triggeredAt;
  final String status;
  final String idempotencyKey;
  final String? failureCode;
  final DateTime createdAt;
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

DateTime _date(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String) return DateTime.parse(value);
  throw FormatException('Expected date string for $key.');
}

DateTime? _optionalDate(Object? value) =>
    value is String ? DateTime.parse(value) : null;

Map<String, dynamic> _map(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  throw const FormatException('Expected object.');
}

Map<String, dynamic>? _optionalMap(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : null;

List<T> _list<T>(
  Object? value,
  T Function(Map<String, dynamic> json) fromJson,
) {
  if (value == null) return <T>[];
  if (value is! List) throw const FormatException('Expected list.');
  return value.map((item) => fromJson(_map(item))).toList(growable: false);
}
