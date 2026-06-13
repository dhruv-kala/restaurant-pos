import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/communication_query.dart';

class CommunicationRepository {
  const CommunicationRepository(this._api);
  final CommunicationApiService _api;

  Future<PaginatedResponse<CommunicationTemplate>> templates(
    CommunicationTemplateQuery query,
  ) => _api.getTemplates(
    page: query.page,
    limit: query.limit,
    channel: query.channel,
    status: query.status,
    search: query.search,
  );

  Future<PaginatedResponse<CommunicationMessage>> messages(
    CommunicationMessageQuery query,
  ) => _api.getMessages(
    page: query.page,
    limit: query.limit,
    channel: query.channel,
    status: query.status,
    search: query.search,
  );

  Future<PaginatedResponse<CommunicationProvider>> providers() =>
      _api.getProviders(limit: 100);

  Future<List<CommunicationTemplateVersion>> templateVersions(String id) =>
      _api.getTemplateVersions(id);

  Future<CommunicationTemplatePreview> previewTemplate(
    String id,
    Map<String, dynamic> values,
  ) => _api.previewTemplate(id, values: values);

  Future<List<CommunicationAttempt>> attempts(String messageId) =>
      _api.getMessageAttempts(messageId);

  Future<CommunicationAnalyticsReport> analytics(
    CommunicationAnalyticsQuery query,
  ) =>
      _api.getAnalytics(from: query.from, to: query.to, groupBy: query.groupBy);
}
