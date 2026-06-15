import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class JobsApiService {
  const JobsApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<OutboxEvent>> getOutboxEvents({
    String? tenantId,
    String? outletId,
    OutboxWorkScope? scope,
    OutboxEventStatus? status,
    String? eventType,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<OutboxEvent>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.outboxEvents,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          scope: scope?.wireName,
          status: status?.wireName,
          eventType: eventType,
          page: page,
          limit: limit,
        ),
      ),
    ),
    OutboxEvent.fromJson,
  );

  Future<PaginatedResponse<BackgroundJob>> getJobs({
    String? tenantId,
    String? outletId,
    OutboxWorkScope? scope,
    BackgroundJobStatus? status,
    String? jobType,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<BackgroundJob>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.jobs,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          scope: scope?.wireName,
          status: status?.wireName,
          jobType: jobType,
          page: page,
          limit: limit,
        ),
      ),
    ),
    BackgroundJob.fromJson,
  );

  Future<BackgroundJobDetail> getJob({
    String? tenantId,
    required String id,
  }) async => BackgroundJobDetail.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.job(id),
        queryParameters: _payload({'tenantId': tenantId}),
      ),
    ),
  );

  Future<List<BackgroundJobAttempt>> getJobAttempts({
    String? tenantId,
    required String id,
  }) async {
    final response = _map(
      await _dio.get<Object?>(
        ApiEndpoints.jobAttempts(id),
        queryParameters: _payload({'tenantId': tenantId}),
      ),
    );
    final data = response['data'];
    if (data is! List) throw const FormatException('Expected attempts list.');
    return data
        .map((item) => BackgroundJobAttempt.fromJson(_mapObject(item)))
        .toList(growable: false);
  }

  Future<BackgroundJob> retryJob({
    String? tenantId,
    required String id,
    String? reason,
  }) async => BackgroundJob.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.jobRetry(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({'reason': reason}),
      ),
    ),
  );

  Future<BackgroundJob> cancelJob({
    String? tenantId,
    required String id,
    required String reason,
  }) async => BackgroundJob.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.jobCancel(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({'reason': reason}),
      ),
    ),
  );

  Future<PaginatedResponse<JobDeadLetter>> getDeadLetters({
    String? tenantId,
    String? outletId,
    OutboxWorkScope? scope,
    JobDeadLetterStatus? status,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<JobDeadLetter>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.jobDeadLetters,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          scope: scope?.wireName,
          status: status?.wireName,
          page: page,
          limit: limit,
        ),
      ),
    ),
    JobDeadLetter.fromJson,
  );

  Future<JobDeadLetter> resolveDeadLetter({
    String? tenantId,
    required String id,
    required String resolutionNote,
  }) async => JobDeadLetter.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.jobDeadLetterResolve(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({'resolutionNote': resolutionNote}),
      ),
    ),
  );

  Future<List<BackgroundJobRetryPolicy>> getRetryPolicies({
    String? tenantId,
    OutboxWorkScope? scope,
    String? jobType,
  }) async {
    final response = _map(
      await _dio.get<Object?>(
        ApiEndpoints.jobRetryPolicies,
        queryParameters: _payload({
          'tenantId': tenantId,
          'scope': scope?.wireName,
          'jobType': jobType,
        }),
      ),
    );
    final data = response['data'];
    if (data is! List) throw const FormatException('Expected policy list.');
    return data
        .map((item) => BackgroundJobRetryPolicy.fromJson(_mapObject(item)))
        .toList(growable: false);
  }

  Future<BackgroundJobRetryPolicy> upsertRetryPolicy({
    String? tenantId,
    OutboxWorkScope scope = OutboxWorkScope.tenant,
    required String jobType,
    required int maxAttempts,
    required int initialDelaySeconds,
    required int maxDelaySeconds,
    required int backoffMultiplier,
  }) async => BackgroundJobRetryPolicy.fromJson(
    _map(
      await _dio.put<Object?>(
        ApiEndpoints.jobRetryPolicies,
        data: _payload({
          'tenantId': tenantId,
          'scope': scope.wireName,
          'jobType': jobType,
          'maxAttempts': maxAttempts,
          'initialDelaySeconds': initialDelaySeconds,
          'maxDelaySeconds': maxDelaySeconds,
          'backoffMultiplier': backoffMultiplier,
        }),
      ),
    ),
  );

  Future<PaginatedResponse<ScheduledJob>> getScheduledJobs({
    String? tenantId,
    String? outletId,
    OutboxWorkScope? scope,
    ScheduledJobStatus? status,
    String? scheduleKey,
    String? jobType,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<ScheduledJob>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.schedulerJobs,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          scope: scope?.wireName,
          status: status?.wireName,
          scheduleKey: scheduleKey,
          jobType: jobType,
          page: page,
          limit: limit,
        ),
      ),
    ),
    ScheduledJob.fromJson,
  );

  Future<ScheduledJob> pauseScheduledJob(ScheduledJob job) async =>
      ScheduledJob.fromJson(
        _map(
          await _dio.post<Object?>(
            ApiEndpoints.schedulerJobPause(job.id),
            queryParameters: _payload({'tenantId': job.tenantId}),
            data: <String, dynamic>{'version': job.version},
          ),
        ),
      );

  Future<ScheduledJob> resumeScheduledJob(ScheduledJob job) async =>
      ScheduledJob.fromJson(
        _map(
          await _dio.post<Object?>(
            ApiEndpoints.schedulerJobResume(job.id),
            queryParameters: _payload({'tenantId': job.tenantId}),
            data: <String, dynamic>{'version': job.version},
          ),
        ),
      );
}

Map<String, dynamic> _query({
  String? tenantId,
  String? outletId,
  String? scope,
  String? status,
  String? eventType,
  String? jobType,
  String? scheduleKey,
  required int page,
  required int limit,
}) => _payload({
  'tenantId': tenantId,
  'outletId': outletId,
  'scope': scope,
  'status': status,
  'eventType': eventType,
  'jobType': jobType,
  'scheduleKey': scheduleKey,
  'page': page,
  'limit': limit,
});

Map<String, dynamic> _map(Response<Object?> response) =>
    _mapObject(response.data);

Map<String, dynamic> _mapObject(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  throw const FormatException('Expected an object response.');
}

Map<String, dynamic> _payload(Map<String, dynamic> values) =>
    Map<String, dynamic>.fromEntries(
      values.entries.where((entry) => entry.value != null),
    );
