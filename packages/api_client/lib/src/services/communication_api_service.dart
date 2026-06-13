import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class CommunicationApiService {
  const CommunicationApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<CommunicationProvider>> getProviders({
    int page = 1,
    int limit = 20,
    String? tenantId,
    CommunicationChannel? channel,
    CommunicationProviderStatus? status,
    String? search,
  }) async => PaginatedResponse<CommunicationProvider>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.communicationProviders,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (tenantId != null) 'tenantId': tenantId,
          if (channel != null) 'channel': channel.wireName,
          if (status != null) 'status': status.wireName,
          if (search?.isNotEmpty ?? false) 'search': search,
        },
      ),
    ),
    CommunicationProvider.fromJson,
  );

  Future<CommunicationProvider> createProvider({
    required CommunicationChannel channel,
    required String providerKey,
    required String displayName,
    required CommunicationProviderStatus status,
    required int priority,
    String? tenantId,
    String? secretReference,
    Map<String, dynamic>? configMetadata,
    Map<String, dynamic>? capabilities,
  }) async => CommunicationProvider.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.communicationProviders,
        data: {
          if (tenantId != null) 'tenantId': tenantId,
          'channel': channel.wireName,
          'providerKey': providerKey,
          'displayName': displayName,
          'status': status.wireName,
          'priority': priority,
          if (secretReference?.isNotEmpty ?? false)
            'secretReference': secretReference,
          if (configMetadata != null) 'configMetadata': configMetadata,
          if (capabilities != null) 'capabilities': capabilities,
        },
      ),
    ),
  );

  Future<CommunicationProvider> updateProvider({
    required String id,
    required int version,
    String? tenantId,
    String? displayName,
    CommunicationProviderStatus? status,
    int? priority,
    String? secretReference,
    Map<String, dynamic>? configMetadata,
    Map<String, dynamic>? capabilities,
  }) async => CommunicationProvider.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.communicationProvider(id),
        data: {
          if (tenantId != null) 'tenantId': tenantId,
          'version': version,
          if (displayName != null) 'displayName': displayName,
          if (status != null) 'status': status.wireName,
          if (priority != null) 'priority': priority,
          if (secretReference?.isNotEmpty ?? false)
            'secretReference': secretReference,
          if (configMetadata != null) 'configMetadata': configMetadata,
          if (capabilities != null) 'capabilities': capabilities,
        },
      ),
    ),
  );

  Future<PaginatedResponse<CommunicationTemplate>> getTemplates({
    int page = 1,
    int limit = 20,
    String? tenantId,
    CommunicationChannel? channel,
    CommunicationTemplateStatus? status,
    String? search,
  }) async => PaginatedResponse<CommunicationTemplate>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.communicationTemplates,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (tenantId != null) 'tenantId': tenantId,
          if (channel != null) 'channel': channel.wireName,
          if (status != null) 'status': status.wireName,
          if (search?.isNotEmpty ?? false) 'search': search,
        },
      ),
    ),
    CommunicationTemplate.fromJson,
  );

  Future<CommunicationTemplate> createTemplate({
    required String templateKey,
    required CommunicationChannel channel,
    required String name,
    required CommunicationTemplateStatus status,
    required String bodyTemplate,
    required List<CommunicationTemplateVariable> variables,
    String? tenantId,
    String? description,
    String? subjectTemplate,
  }) async => CommunicationTemplate.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.communicationTemplates,
        data: {
          if (tenantId != null) 'tenantId': tenantId,
          'templateKey': templateKey,
          'channel': channel.wireName,
          'name': name,
          if (description?.isNotEmpty ?? false) 'description': description,
          'status': status.wireName,
          if (subjectTemplate?.isNotEmpty ?? false)
            'subjectTemplate': subjectTemplate,
          'bodyTemplate': bodyTemplate,
          'variables': variables.map((item) => item.toJson()).toList(),
        },
      ),
    ),
  );

  Future<CommunicationTemplate> updateTemplate({
    required String id,
    required int version,
    String? tenantId,
    String? name,
    String? description,
    CommunicationTemplateStatus? status,
    String? subjectTemplate,
    String? bodyTemplate,
    List<CommunicationTemplateVariable>? variables,
  }) async => CommunicationTemplate.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.communicationTemplate(id),
        data: {
          if (tenantId != null) 'tenantId': tenantId,
          'version': version,
          if (name != null) 'name': name,
          if (description != null) 'description': description,
          if (status != null) 'status': status.wireName,
          if (subjectTemplate != null) 'subjectTemplate': subjectTemplate,
          if (bodyTemplate != null) 'bodyTemplate': bodyTemplate,
          if (variables != null)
            'variables': variables.map((item) => item.toJson()).toList(),
        },
      ),
    ),
  );

  Future<List<CommunicationTemplateVersion>> getTemplateVersions(
    String id, {
    String? tenantId,
  }) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.communicationTemplateVersions(id),
      queryParameters: {if (tenantId != null) 'tenantId': tenantId},
    ),
  ).map(CommunicationTemplateVersion.fromJson).toList(growable: false);

  Future<CommunicationTemplatePreview> previewTemplate(
    String id, {
    required Map<String, dynamic> values,
    String? tenantId,
  }) async => CommunicationTemplatePreview.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.communicationTemplatePreview(id),
        data: {if (tenantId != null) 'tenantId': tenantId, 'values': values},
      ),
    ),
  );

  Future<PaginatedResponse<CommunicationMessage>> getMessages({
    int page = 1,
    int limit = 20,
    String? tenantId,
    String? outletId,
    CommunicationChannel? channel,
    CommunicationMessageStatus? status,
    String? search,
  }) async => PaginatedResponse<CommunicationMessage>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.communicationMessages,
        queryParameters: {
          'page': page,
          'limit': limit,
          if (tenantId != null) 'tenantId': tenantId,
          if (outletId != null) 'outletId': outletId,
          if (channel != null) 'channel': channel.wireName,
          if (status != null) 'status': status.wireName,
          if (search?.isNotEmpty ?? false) 'search': search,
        },
      ),
    ),
    CommunicationMessage.fromJson,
  );

  Future<CommunicationMessage> getMessage(
    String id, {
    String? tenantId,
    String? outletId,
  }) async => CommunicationMessage.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.communicationMessage(id),
        queryParameters: {
          if (tenantId != null) 'tenantId': tenantId,
          if (outletId != null) 'outletId': outletId,
        },
      ),
    ),
  );

  Future<List<CommunicationAttempt>> getMessageAttempts(
    String id, {
    String? tenantId,
    String? outletId,
  }) async {
    final payload = _map(
      await _dio.get<Object?>(
        ApiEndpoints.communicationMessageAttempts(id),
        queryParameters: {
          if (tenantId != null) 'tenantId': tenantId,
          if (outletId != null) 'outletId': outletId,
        },
      ),
    );
    return (payload['attempts'] as List<dynamic>? ?? const [])
        .map(
          (item) => CommunicationAttempt.fromJson(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList(growable: false);
  }
}

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}

List<Map<String, dynamic>> _list(Response<Object?> response) {
  if (response.data is List) {
    return (response.data! as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);
  }
  throw const FormatException('Expected a list response.');
}
