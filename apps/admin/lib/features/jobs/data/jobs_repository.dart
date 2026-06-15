import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/jobs_query.dart';

class JobsRepository {
  const JobsRepository(this._api);

  final JobsApiService _api;

  Future<PaginatedResponse<BackgroundJob>> jobs(BackgroundJobQuery query) =>
      _api.getJobs(
        tenantId: query.tenantId,
        outletId: query.outletId,
        scope: query.scope,
        status: query.status,
        jobType: query.jobType,
        page: query.page,
        limit: query.limit,
      );

  Future<BackgroundJobDetail> jobDetail(BackgroundJob job) =>
      _api.getJob(tenantId: job.tenantId, id: job.id);

  Future<List<BackgroundJobAttempt>> attempts(BackgroundJob job) =>
      _api.getJobAttempts(tenantId: job.tenantId, id: job.id);

  Future<BackgroundJob> retryJob(BackgroundJob job, {String? reason}) =>
      _api.retryJob(tenantId: job.tenantId, id: job.id, reason: reason);

  Future<BackgroundJob> retryDeadLetter(
    JobDeadLetter deadLetter, {
    String? reason,
  }) => _api.retryJob(
    tenantId: deadLetter.tenantId,
    id: deadLetter.jobId,
    reason: reason,
  );

  Future<BackgroundJob> cancelJob(
    BackgroundJob job, {
    required String reason,
  }) => _api.cancelJob(tenantId: job.tenantId, id: job.id, reason: reason);

  Future<PaginatedResponse<JobDeadLetter>> deadLetters(
    JobDeadLetterQuery query,
  ) => _api.getDeadLetters(
    tenantId: query.tenantId,
    outletId: query.outletId,
    scope: query.scope,
    status: query.status,
    page: query.page,
    limit: query.limit,
  );

  Future<JobDeadLetter> resolveDeadLetter(
    JobDeadLetter deadLetter, {
    required String resolutionNote,
  }) => _api.resolveDeadLetter(
    tenantId: deadLetter.tenantId,
    id: deadLetter.id,
    resolutionNote: resolutionNote,
  );

  Future<PaginatedResponse<ScheduledJob>> scheduledJobs(
    ScheduledJobQuery query,
  ) => _api.getScheduledJobs(
    tenantId: query.tenantId,
    outletId: query.outletId,
    scope: query.scope,
    status: query.status,
    scheduleKey: query.scheduleKey,
    jobType: query.jobType,
    page: query.page,
    limit: query.limit,
  );

  Future<ScheduledJob> pauseSchedule(ScheduledJob job) =>
      _api.pauseScheduledJob(job);

  Future<ScheduledJob> resumeSchedule(ScheduledJob job) =>
      _api.resumeScheduledJob(job);

  Future<List<BackgroundJobRetryPolicy>> retryPolicies(
    RetryPolicyQuery query,
  ) => _api.getRetryPolicies(
    tenantId: query.tenantId,
    scope: query.scope,
    jobType: query.jobType,
  );

  Future<BackgroundJobRetryPolicy> upsertRetryPolicy({
    String? tenantId,
    required OutboxWorkScope scope,
    required String jobType,
    required int maxAttempts,
    required int initialDelaySeconds,
    required int maxDelaySeconds,
    required int backoffMultiplier,
  }) => _api.upsertRetryPolicy(
    tenantId: tenantId,
    scope: scope,
    jobType: jobType,
    maxAttempts: maxAttempts,
    initialDelaySeconds: initialDelaySeconds,
    maxDelaySeconds: maxDelaySeconds,
    backoffMultiplier: backoffMultiplier,
  );

  Future<PaginatedResponse<OutboxEvent>> outboxEvents(OutboxEventQuery query) =>
      _api.getOutboxEvents(
        tenantId: query.tenantId,
        outletId: query.outletId,
        scope: query.scope,
        status: query.status,
        eventType: query.eventType,
        page: query.page,
        limit: query.limit,
      );
}
