import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class KitchenApiService {
  const KitchenApiService(this._dio);
  final Dio _dio;

  Future<List<KitchenStation>> getStations({String? outletId}) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.kitchenStations,
      queryParameters: <String, dynamic>{
        if (outletId != null) 'outletId': outletId,
      },
    );
    return _list(response, KitchenStation.fromJson);
  }

  Future<KitchenStation> createStation(Map<String, dynamic> data) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.kitchenStations,
      data: data,
    );
    return KitchenStation.fromJson(_map(response));
  }

  Future<KitchenStation> updateStation(
    String id,
    Map<String, dynamic> data,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.kitchenStation(id),
      data: data,
    );
    return KitchenStation.fromJson(_map(response));
  }

  Future<void> deleteStation(String id) async {
    await _dio.delete<Object?>(ApiEndpoints.kitchenStation(id));
  }

  Future<List<KitchenQueueOrder>> getQueue({
    String? outletId,
    String? stationId,
    KitchenPriority? priority,
    OrderStatus? status,
    String? search,
    int limit = 200,
  }) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.kitchenQueue,
      queryParameters: <String, dynamic>{
        if (outletId != null) 'outletId': outletId,
        if (stationId != null) 'stationId': stationId,
        if (priority != null) 'priority': priority.wireName,
        if (status != null) 'status': status.wireName,
        if (search != null && search.isNotEmpty) 'search': search,
        'limit': limit,
      },
    );
    return _list(response, KitchenTicket.fromJson);
  }

  Future<KitchenMetrics> getMetrics({
    String? outletId,
    String? stationId,
  }) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.kitchenMetrics,
      queryParameters: <String, dynamic>{
        if (outletId != null) 'outletId': outletId,
        if (stationId != null) 'stationId': stationId,
      },
    );
    return KitchenMetrics.fromJson(_map(response));
  }

  Future<KitchenQueueOrder> updateItemStatus(
    String id,
    OrderItemStatus status,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.kitchenItemStatus(id),
      data: <String, dynamic>{'status': status.wireName},
    );
    return KitchenTicket.fromJson(_map(response));
  }

  Future<KitchenQueueOrder> updateOrderStatus(
    String id,
    OrderStatus status,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.kitchenOrderStatus(id),
      data: <String, dynamic>{'status': status.wireName},
    );
    return KitchenTicket.fromJson(_map(response));
  }
}

List<T> _list<T>(
  Response<Object?> response,
  T Function(Map<String, dynamic>) fromJson,
) {
  final data = response.data;
  if (data is! List<dynamic>)
    throw const FormatException('Expected an array response.');
  return data
      .map((item) => fromJson(item as Map<String, dynamic>))
      .toList(growable: false);
}

Map<String, dynamic> _map(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Expected an object response.');
}
