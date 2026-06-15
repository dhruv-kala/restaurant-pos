import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class JobOpsScope {
  const JobOpsScope({required this.scope, this.tenantId, this.outletId});

  final OutboxWorkScope scope;
  final String? tenantId;
  final String? outletId;
}

class BackgroundJobQuery {
  const BackgroundJobQuery({
    this.tenantId,
    this.outletId,
    this.scope,
    this.status,
    this.jobType,
    this.page = 1,
    this.limit = 20,
  });

  final String? tenantId;
  final String? outletId;
  final OutboxWorkScope? scope;
  final BackgroundJobStatus? status;
  final String? jobType;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BackgroundJobQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          scope == other.scope &&
          status == other.status &&
          jobType == other.jobType &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode =>
      Object.hash(tenantId, outletId, scope, status, jobType, page, limit);
}

class JobDeadLetterQuery {
  const JobDeadLetterQuery({
    this.tenantId,
    this.outletId,
    this.scope,
    this.status,
    this.page = 1,
    this.limit = 20,
  });

  final String? tenantId;
  final String? outletId;
  final OutboxWorkScope? scope;
  final JobDeadLetterStatus? status;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is JobDeadLetterQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          scope == other.scope &&
          status == other.status &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode =>
      Object.hash(tenantId, outletId, scope, status, page, limit);
}

class ScheduledJobQuery {
  const ScheduledJobQuery({
    this.tenantId,
    this.outletId,
    this.scope,
    this.status,
    this.scheduleKey,
    this.jobType,
    this.page = 1,
    this.limit = 20,
  });

  final String? tenantId;
  final String? outletId;
  final OutboxWorkScope? scope;
  final ScheduledJobStatus? status;
  final String? scheduleKey;
  final String? jobType;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ScheduledJobQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          scope == other.scope &&
          status == other.status &&
          scheduleKey == other.scheduleKey &&
          jobType == other.jobType &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(
    tenantId,
    outletId,
    scope,
    status,
    scheduleKey,
    jobType,
    page,
    limit,
  );
}

class OutboxEventQuery {
  const OutboxEventQuery({
    this.tenantId,
    this.outletId,
    this.scope,
    this.status,
    this.eventType,
    this.page = 1,
    this.limit = 20,
  });

  final String? tenantId;
  final String? outletId;
  final OutboxWorkScope? scope;
  final OutboxEventStatus? status;
  final String? eventType;
  final int page;
  final int limit;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OutboxEventQuery &&
          tenantId == other.tenantId &&
          outletId == other.outletId &&
          scope == other.scope &&
          status == other.status &&
          eventType == other.eventType &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode =>
      Object.hash(tenantId, outletId, scope, status, eventType, page, limit);
}

class RetryPolicyQuery {
  const RetryPolicyQuery({this.tenantId, this.scope, this.jobType});

  final String? tenantId;
  final OutboxWorkScope? scope;
  final String? jobType;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RetryPolicyQuery &&
          tenantId == other.tenantId &&
          scope == other.scope &&
          jobType == other.jobType;

  @override
  int get hashCode => Object.hash(tenantId, scope, jobType);
}
