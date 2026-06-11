import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class PaymentsApiService {
  const PaymentsApiService(this._dio);
  final Dio _dio;

  Future<Payment> createPayment(Map<String, dynamic> data) =>
      _write('post', ApiEndpoints.payments, data);

  Future<Payment> splitPayment(Map<String, dynamic> data) =>
      _write('post', ApiEndpoints.paymentsSplit, data);

  Future<Payment> refundPayment(
    String id,
    int amount,
    String reason, {
    String? idempotencyKey,
  }) => _write('post', ApiEndpoints.paymentRefund(id), <String, dynamic>{
    'refundAmount': amount,
    'refundReason': reason,
    'idempotencyKey': idempotencyKey ?? _key('refund'),
  });

  Future<Payment> getPayment(String id) async {
    final response = await _dio.get<Object?>(ApiEndpoints.payment(id));
    return Payment.fromJson(_map(response));
  }

  Future<PaginatedResponse<Payment>> getPayments({
    int page = 1,
    int limit = 20,
    PaymentStatus? status,
    PaymentMethod? paymentMethod,
    String? billId,
    String? referenceNumber,
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final response = await _dio.get<Object?>(
      ApiEndpoints.payments,
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (status != null) 'status': status.wireName,
        if (paymentMethod != null) 'paymentMethod': paymentMethod.wireName,
        if (billId != null) 'billId': billId,
        if (referenceNumber != null && referenceNumber.isNotEmpty)
          'referenceNumber': referenceNumber,
        if (fromDate != null) 'fromDate': fromDate.toUtc().toIso8601String(),
        if (toDate != null) 'toDate': toDate.toUtc().toIso8601String(),
      },
    );
    return PaginatedResponse<Payment>.fromJson(
      _map(response),
      Payment.fromJson,
    );
  }

  Future<Payment> updatePaymentStatus(String id, PaymentStatus status) =>
      _write('patch', ApiEndpoints.paymentStatus(id), <String, String>{
        'status': status.wireName,
      });

  static String idempotencyKey([String prefix = 'payment']) => _key(prefix);

  Future<Payment> _write(
    String method,
    String path,
    Map<String, dynamic> data,
  ) async {
    final response = switch (method) {
      'post' => await _dio.post<Object?>(path, data: data),
      'patch' => await _dio.patch<Object?>(path, data: data),
      _ => throw ArgumentError.value(method, 'method'),
    };
    return Payment.fromJson(_map(response));
  }
}

String _key(String prefix) =>
    '$prefix-${DateTime.now().toUtc().microsecondsSinceEpoch}';

Map<String, dynamic> _map(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Expected an object response.');
}
