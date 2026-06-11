import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class OutletApiService {
  const OutletApiService(this._dio);

  final Dio _dio;

  Future<PaginatedResponse<Outlet>> list({
    int page = 1,
    int limit = 20,
    String? search,
    OutletStatus? status,
    String? tenantId,
  }) async {
    final response = await _dio.get<Object?>(
      tenantId == null
          ? ApiEndpoints.outlets
          : ApiEndpoints.tenantOutlets(tenantId),
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (search != null) 'search': search,
        if (status != null) 'status': status.toJson(),
      },
    );
    return PaginatedResponse<Outlet>.fromJson(
      _responseMap(response),
      Outlet.fromJson,
    );
  }

  Future<Outlet> get(String outletId) async {
    final response = await _dio.get<Object?>(ApiEndpoints.outlet(outletId));
    return Outlet.fromJson(_responseMap(response));
  }

  Future<Outlet> create(Map<String, dynamic> payload) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.outlets,
      data: payload,
    );
    return Outlet.fromJson(_responseMap(response));
  }

  Future<Outlet> update(
    String outletId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.outlet(outletId),
      data: payload,
    );
    return Outlet.fromJson(_responseMap(response));
  }

  Future<Outlet> updateStatus(
    String outletId,
    OutletStatus status,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.outletStatus(outletId),
      data: <String, dynamic>{'status': status.toJson()},
    );
    return Outlet.fromJson(_responseMap(response));
  }
}

Map<String, dynamic> _responseMap(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) {
    return data;
  }
  throw const FormatException('Expected an object response.');
}
