import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class ReceiptsApiService {
  const ReceiptsApiService(this._dio);
  final Dio _dio;

  Future<Receipt> generateReceipt(
    String billId, {
    ReceiptType type = ReceiptType.customerReceipt,
    String? paymentId,
  }) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.receiptsGenerate,
      data: <String, dynamic>{
        'billId': billId,
        'receiptType': type.wireName,
        if (paymentId != null) 'paymentId': paymentId,
      },
    );
    return Receipt.fromJson(_map(response));
  }

  Future<Receipt> getReceipt(String id) async {
    final response = await _dio.get<Object?>(ApiEndpoints.receipt(id));
    return Receipt.fromJson(_map(response));
  }

  Future<PaginatedResponse<Receipt>> getReceipts({
    int page = 1,
    int limit = 20,
    ReceiptType? type,
    ReceiptStatus? status,
    String? billId,
    String? receiptNumber,
  }) async {
    final response = await _dio.get<Object?>(
      type == ReceiptType.taxInvoice
          ? ApiEndpoints.invoices
          : ApiEndpoints.receipts,
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (type != null) 'receiptType': type.wireName,
        if (status != null) 'status': status.wireName,
        if (billId != null) 'billId': billId,
        if (receiptNumber != null && receiptNumber.isNotEmpty)
          'receiptNumber': receiptNumber,
      },
    );
    return PaginatedResponse<Receipt>.fromJson(
      _map(response),
      Receipt.fromJson,
    );
  }

  Future<Receipt> printReceipt(
    String id, {
    required String printerName,
    required PrinterType printerType,
    int copies = 1,
    bool reprint = false,
  }) async {
    final response = await _dio.post<Object?>(
      reprint ? ApiEndpoints.receiptReprint(id) : ApiEndpoints.receiptPrint(id),
      data: <String, dynamic>{
        'printerName': printerName,
        'printerType': printerType.wireName,
        'copies': copies,
      },
    );
    return Receipt.fromJson(_map(response));
  }

  Future<Receipt> reprintReceipt(
    String id, {
    required String printerName,
    required PrinterType printerType,
    int copies = 1,
  }) => printReceipt(
    id,
    printerName: printerName,
    printerType: printerType,
    copies: copies,
    reprint: true,
  );

  Future<List<int>> downloadPdf(String id) async {
    final response = await _dio.get<List<int>>(
      ApiEndpoints.receiptPdf(id),
      options: Options(responseType: ResponseType.bytes),
    );
    return response.data ?? const <int>[];
  }
}

Map<String, dynamic> _map(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Expected an object response.');
}
