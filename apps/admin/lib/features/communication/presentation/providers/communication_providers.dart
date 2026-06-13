import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/communication_repository.dart';
import '../../domain/communication_query.dart';

final communicationApiServiceProvider = Provider<CommunicationApiService>(
  (ref) => CommunicationApiService(ref.watch(dioProvider)),
);
final communicationRepositoryProvider = Provider<CommunicationRepository>(
  (ref) => CommunicationRepository(ref.watch(communicationApiServiceProvider)),
);
final communicationAnalyticsProvider = FutureProvider.autoDispose
    .family<CommunicationAnalyticsReport, CommunicationAnalyticsQuery>(
      (ref, query) =>
          ref.watch(communicationRepositoryProvider).analytics(query),
    );
final communicationTemplatesProvider = FutureProvider.autoDispose
    .family<
      PaginatedResponse<CommunicationTemplate>,
      CommunicationTemplateQuery
    >(
      (ref, query) =>
          ref.watch(communicationRepositoryProvider).templates(query),
    );
final communicationMessagesProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<CommunicationMessage>, CommunicationMessageQuery>(
      (ref, query) =>
          ref.watch(communicationRepositoryProvider).messages(query),
    );
final communicationProvidersListProvider =
    FutureProvider.autoDispose<PaginatedResponse<CommunicationProvider>>(
      (ref) => ref.watch(communicationRepositoryProvider).providers(),
    );
final communicationTemplateVersionsProvider = FutureProvider.autoDispose
    .family<List<CommunicationTemplateVersion>, String>(
      (ref, id) =>
          ref.watch(communicationRepositoryProvider).templateVersions(id),
    );
final communicationAttemptsProvider = FutureProvider.autoDispose
    .family<List<CommunicationAttempt>, String>(
      (ref, id) => ref.watch(communicationRepositoryProvider).attempts(id),
    );
