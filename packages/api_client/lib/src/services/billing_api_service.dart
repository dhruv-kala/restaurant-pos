import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class BillingApiService {
  const BillingApiService(this._dio);
  final Dio _dio;

  Future<Bill> generateBill(String orderId, {Map<String, dynamic>? data}) =>
      _billWrite('post', ApiEndpoints.billingGenerate, <String, dynamic>{
        'orderId': orderId,
        ...?data,
      });

  Future<Bill> getBill(String id) async {
    final response = await _dio.get<Object?>(ApiEndpoints.bill(id));
    return Bill.fromJson(_map(response));
  }

  Future<PaginatedResponse<Bill>> getBills({
    int page = 1,
    int limit = 20,
    String? outletId,
    BillStatus? status,
    String? billNumber,
    String? orderId,
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.billing,
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (outletId != null) 'outletId': outletId,
        if (status != null) 'status': status.wireName,
        if (billNumber != null && billNumber.isNotEmpty)
          'billNumber': billNumber,
        if (orderId != null) 'orderId': orderId,
        if (fromDate != null) 'fromDate': fromDate.toUtc().toIso8601String(),
        if (toDate != null) 'toDate': toDate.toUtc().toIso8601String(),
      },
    );
    return PaginatedResponse<Bill>.fromJson(_map(response), Bill.fromJson);
  }

  Future<Bill> updateBill(String id, Map<String, dynamic> data) =>
      _billWrite('patch', ApiEndpoints.bill(id), data);

  Future<Bill> voidBill(String id, String reason) => _billWrite(
    'post',
    ApiEndpoints.billVoid(id),
    <String, String>{'reason': reason},
  );

  Future<List<Bill>> splitBill(String id, Map<String, dynamic> data) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.billSplit(id),
      data: data,
    );
    final value = response.data;
    if (value is! List<dynamic>) {
      throw const FormatException('Expected an array response.');
    }
    return value
        .map((item) => Bill.fromJson(item as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<Bill> mergeBills(List<String> billIds) => _billWrite(
    'post',
    ApiEndpoints.billingMerge,
    <String, dynamic>{'billIds': billIds},
  );

  Future<Bill> getPrintableBill(String id) async {
    final response = await _dio.get<Object?>(ApiEndpoints.billPrint(id));
    return Bill.fromJson(_map(response));
  }

  Future<Bill> _billWrite(
    String method,
    String path,
    Map<String, dynamic> data,
  ) async {
    final response = switch (method) {
      'post' => await _dio.post<Object?>(path, data: data),
      'patch' => await _dio.patch<Object?>(path, data: data),
      _ => throw ArgumentError.value(method, 'method'),
    };
    return Bill.fromJson(_map(response));
  }
}

Map<String, dynamic> _map(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Expected an object response.');
}
