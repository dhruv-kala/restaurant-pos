import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class TenantApiService {
  const TenantApiService(this._dio);

  final Dio _dio;

  Future<PaginatedResponse<Tenant>> list({
    int page = 1,
    int limit = 20,
    String? search,
    TenantStatus? status,
  }) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.tenants,
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (search != null) 'search': search,
        if (status != null) 'status': status.toJson(),
      },
    );
    return PaginatedResponse<Tenant>.fromJson(
      _responseMap(response),
      Tenant.fromJson,
    );
  }

  Future<Tenant> get(String tenantId) async {
    final response = await _dio.get<Object?>(ApiEndpoints.tenant(tenantId));
    return Tenant.fromJson(_responseMap(response));
  }

  Future<Tenant> create(Map<String, dynamic> payload) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.tenants,
      data: payload,
    );
    return Tenant.fromJson(_responseMap(response));
  }

  Future<Tenant> update(String tenantId, Map<String, dynamic> payload) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.tenant(tenantId),
      data: payload,
    );
    return Tenant.fromJson(_responseMap(response));
  }

  Future<Tenant> updateStatus(String tenantId, TenantStatus status) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.tenantStatus(tenantId),
      data: <String, dynamic>{'status': status.toJson()},
    );
    return Tenant.fromJson(_responseMap(response));
  }
}

Map<String, dynamic> _responseMap(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) {
    return data;
  }
  throw const FormatException('Expected an object response.');
}
