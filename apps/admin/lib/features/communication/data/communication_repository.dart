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

  Future<CommunicationDashboardSummary> dashboard() async {
    final results = await Future.wait([
      _api.getMessages(limit: 1, status: CommunicationMessageStatus.sent),
      _api.getMessages(limit: 1, status: CommunicationMessageStatus.delivered),
      _api.getMessages(limit: 1, status: CommunicationMessageStatus.read),
      _api.getMessages(limit: 1, status: CommunicationMessageStatus.failed),
      ...CommunicationChannel.values.map(
        (channel) => _api.getMessages(limit: 1, channel: channel),
      ),
    ]);
    final channelUsage = <CommunicationChannel, int>{};
    for (var index = 0; index < CommunicationChannel.values.length; index++) {
      channelUsage[CommunicationChannel.values[index]] =
          results[index + 4].meta.total;
    }
    return CommunicationDashboardSummary(
      totalMessages:
          results[0].meta.total +
          results[1].meta.total +
          results[2].meta.total +
          results[3].meta.total,
      successfulMessages: results[1].meta.total + results[2].meta.total,
      failedMessages: results[3].meta.total,
      channelUsage: channelUsage,
    );
  }
}
