import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class OrdersApiService {
  const OrdersApiService(this._dio);
  final Dio _dio;

  Future<Order> createOrder(Map<String, dynamic> data) =>
      _write('post', ApiEndpoints.orders, data);

  Future<PaginatedResponse<Order>> getOrders({
    int page = 1,
    int limit = 20,
    String? outletId,
    OrderStatus? status,
    OrderType? orderType,
    String? tableId,
    String? waiterId,
    String? customerId,
    DateTime? fromDate,
    DateTime? toDate,
    String? search,
  }) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.orders,
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (outletId != null) 'outletId': outletId,
        if (status != null) 'status': status.wireName,
        if (orderType != null) 'orderType': orderType.wireName,
        if (tableId != null) 'tableId': tableId,
        if (waiterId != null) 'waiterId': waiterId,
        if (customerId != null) 'customerId': customerId,
        if (fromDate != null) 'fromDate': fromDate.toUtc().toIso8601String(),
        if (toDate != null) 'toDate': toDate.toUtc().toIso8601String(),
        if (search != null && search.isNotEmpty) 'search': search,
      },
    );
    return PaginatedResponse<Order>.fromJson(_map(response), Order.fromJson);
  }

  Future<Order> getOrder(String id) async {
    final response = await _dio.get<Object?>(ApiEndpoints.order(id));
    return Order.fromJson(_map(response));
  }

  Future<Order> updateOrder(String id, Map<String, dynamic> data) =>
      _write('patch', ApiEndpoints.order(id), data);

  Future<Order> updateStatus(String id, OrderStatus status) => _write(
    'patch',
    ApiEndpoints.orderStatus(id),
    <String, String>{'status': status.wireName},
  );

  Future<Order> cancelOrder(String id, String reason) => _write(
    'post',
    ApiEndpoints.orderCancel(id),
    <String, String>{'reason': reason},
  );

  Future<Order> addItem(String id, Map<String, dynamic> data) =>
      _write('post', ApiEndpoints.orderItems(id), data);

  Future<Order> updateItem(String id, Map<String, dynamic> data) =>
      _write('patch', ApiEndpoints.orderItem(id), data);

  Future<Order> deleteItem(String id) async {
    final response = await _dio.delete<Object?>(ApiEndpoints.orderItem(id));
    return Order.fromJson(_map(response));
  }

  Future<Order> transferOrder(String id, String targetTableId) => _write(
    'post',
    ApiEndpoints.orderTransfer(id),
    <String, String>{'targetTableId': targetTableId},
  );

  Future<List<Order>> getKitchenQueue() async {
    final response = await _dio.get<Object?>(ApiEndpoints.kitchenQueue);
    final data = response.data;
    if (data is! List<dynamic>) {
      throw const FormatException('Expected an array response.');
    }
    return data
        .map((item) => Order.fromJson(item as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<Order> _write(
    String method,
    String path,
    Map<String, dynamic> data,
  ) async {
    final response = switch (method) {
      'post' => await _dio.post<Object?>(path, data: data),
      'patch' => await _dio.patch<Object?>(path, data: data),
      _ => throw ArgumentError.value(method, 'method'),
    };
    return Order.fromJson(_map(response));
  }
}

Map<String, dynamic> _map(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Expected an object response.');
}
