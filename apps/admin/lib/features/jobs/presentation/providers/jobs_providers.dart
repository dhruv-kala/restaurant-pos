import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/jobs_repository.dart';
import '../../domain/jobs_query.dart';

final jobsApiServiceProvider = Provider<JobsApiService>(
  (ref) => JobsApiService(ref.watch(dioProvider)),
);

final jobsRepositoryProvider = Provider<JobsRepository>(
  (ref) => JobsRepository(ref.watch(jobsApiServiceProvider)),
);

final backgroundJobsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<BackgroundJob>, BackgroundJobQuery>(
      (ref, query) => ref.watch(jobsRepositoryProvider).jobs(query),
    );

final jobDeadLettersProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<JobDeadLetter>, JobDeadLetterQuery>(
      (ref, query) => ref.watch(jobsRepositoryProvider).deadLetters(query),
    );

final scheduledJobsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<ScheduledJob>, ScheduledJobQuery>(
      (ref, query) => ref.watch(jobsRepositoryProvider).scheduledJobs(query),
    );

final retryPoliciesProvider = FutureProvider.autoDispose
    .family<List<BackgroundJobRetryPolicy>, RetryPolicyQuery>(
      (ref, query) => ref.watch(jobsRepositoryProvider).retryPolicies(query),
    );

final outboxEventsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<OutboxEvent>, OutboxEventQuery>(
      (ref, query) => ref.watch(jobsRepositoryProvider).outboxEvents(query),
    );
