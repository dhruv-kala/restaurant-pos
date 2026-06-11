import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class KdsApiService {
  const KdsApiService(this._dio);
  final Dio _dio;

  Future<List<KitchenTicket>> getQueue({
    String? outletId,
    String? kitchenCategoryId,
    OrderPriority? priority,
    OrderStatus? status,
    String? search,
  }) => _getTickets(
    ApiEndpoints.kdsQueue,
    outletId: outletId,
    kitchenCategoryId: kitchenCategoryId,
    priority: priority,
    status: status,
    search: search,
  );

  Future<List<KitchenTicket>> getActiveOrders({
    String? outletId,
    String? kitchenCategoryId,
  }) => _getTickets(
    ApiEndpoints.kdsActive,
    outletId: outletId,
    kitchenCategoryId: kitchenCategoryId,
  );

  Future<List<KitchenTicket>> getReadyOrders({String? outletId}) =>
      _getTickets(ApiEndpoints.kdsReady, outletId: outletId);

  Future<List<KitchenTicket>> getCompletedOrders({String? outletId}) =>
      _getTickets(ApiEndpoints.kdsCompleted, outletId: outletId);

  Future<List<KitchenCategory>> getCategories({String? outletId}) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.kdsCategories,
      queryParameters: <String, dynamic>{
        if (outletId != null) 'outletId': outletId,
      },
    );
    return _list(response, KitchenCategory.fromJson);
  }

  Future<KitchenTicket> startItem(String id, {int? estimatedPrepMinutes}) =>
      _write(ApiEndpoints.kdsItemStart(id), <String, dynamic>{
        if (estimatedPrepMinutes != null)
          'estimatedPrepMinutes': estimatedPrepMinutes,
      });

  Future<KitchenTicket> markReady(String id) =>
      _write(ApiEndpoints.kdsItemReady(id));

  Future<KitchenTicket> markServed(String id) =>
      _write(ApiEndpoints.kdsItemServed(id));

  Future<KitchenTicket> startOrder(String id) =>
      _write(ApiEndpoints.kdsOrderStart(id));

  Future<KitchenTicket> readyOrder(String id) =>
      _write(ApiEndpoints.kdsOrderReady(id));

  Future<List<KitchenTicket>> _getTickets(
    String path, {
    String? outletId,
    String? kitchenCategoryId,
    OrderPriority? priority,
    OrderStatus? status,
    String? search,
  }) async {
    final response = await _dio.get<Object?>(
      path,
      queryParameters: <String, dynamic>{
        if (outletId != null) 'outletId': outletId,
        if (kitchenCategoryId != null) 'kitchenCategoryId': kitchenCategoryId,
        if (priority != null) 'priority': priority.wireName,
        if (status != null) 'status': status.wireName,
        if (search != null && search.isNotEmpty) 'search': search,
      },
    );
    return _list(response, KitchenTicket.fromJson);
  }

  Future<KitchenTicket> _write(
    String path, [
    Map<String, dynamic> data = const <String, dynamic>{},
  ]) async {
    final response = await _dio.post<Object?>(path, data: data);
    return KitchenTicket.fromJson(_map(response));
  }
}

List<T> _list<T>(
  Response<Object?> response,
  T Function(Map<String, dynamic>) fromJson,
) {
  final data = response.data;
  if (data is! List<dynamic>) {
    throw const FormatException('Expected an array response.');
  }
  return data
      .map((item) => fromJson(item as Map<String, dynamic>))
      .toList(growable: false);
}

Map<String, dynamic> _map(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Expected an object response.');
}
