import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class OperationsApiService {
  const OperationsApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<BusinessDay>> getBusinessDays({
    String? tenantId,
    String? outletId,
    BusinessDayStatus? status,
    DateTime? businessDate,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<BusinessDay>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.businessDays,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          status: status?.wireName,
          businessDate: businessDate,
          page: page,
          limit: limit,
        ),
      ),
    ),
    BusinessDay.fromJson,
  );

  Future<BusinessDay> openBusinessDay({
    String? tenantId,
    required String outletId,
    required DateTime businessDate,
    String? openingNotes,
  }) async => BusinessDay.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.businessDays,
        data: _payload({
          'tenantId': tenantId,
          'outletId': outletId,
          'businessDate': _dateOnly(businessDate),
          'openingNotes': openingNotes,
        }),
      ),
    ),
  );

  Future<BusinessDay> getCurrentBusinessDay({
    String? tenantId,
    required String outletId,
  }) async => BusinessDay.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.businessDayCurrent,
        queryParameters: _payload({'tenantId': tenantId, 'outletId': outletId}),
      ),
    ),
  );

  Future<BusinessDay> closeBusinessDay({
    String? tenantId,
    required String id,
    required int version,
    String? closingNotes,
  }) async => BusinessDay.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.businessDayClose(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({'version': version, 'closingNotes': closingNotes}),
      ),
    ),
  );

  Future<BusinessDayClosing> getBusinessDayClosing({
    String? tenantId,
    required String id,
  }) async => BusinessDayClosing.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.businessDayClosing(id),
        queryParameters: _payload({'tenantId': tenantId}),
      ),
    ),
  );

  Future<PaginatedResponse<ShiftSession>> getShiftSessions({
    String? tenantId,
    String? outletId,
    String? businessDayId,
    String? assignedUserId,
    ShiftSessionStatus? status,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<ShiftSession>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.shiftSessions,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          businessDayId: businessDayId,
          assignedUserId: assignedUserId,
          status: status?.wireName,
          page: page,
          limit: limit,
        ),
      ),
    ),
    ShiftSession.fromJson,
  );

  Future<ShiftSession> openShiftSession({
    String? tenantId,
    required String outletId,
    String? assignedUserId,
    String? shiftId,
    String? openingNotes,
  }) async => ShiftSession.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.shiftSessions,
        data: _payload({
          'tenantId': tenantId,
          'outletId': outletId,
          'assignedUserId': assignedUserId,
          'shiftId': shiftId,
          'openingNotes': openingNotes,
        }),
      ),
    ),
  );

  Future<ShiftSession> closeShiftSession({
    String? tenantId,
    required String id,
    required int version,
    String? closingNotes,
  }) async => ShiftSession.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.shiftSessionClose(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({'version': version, 'closingNotes': closingNotes}),
      ),
    ),
  );

  Future<PaginatedResponse<CashDrawer>> getCashDrawers({
    String? tenantId,
    String? outletId,
    String? businessDayId,
    String? shiftSessionId,
    CashDrawerStatus? status,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<CashDrawer>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.cashDrawers,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          businessDayId: businessDayId,
          shiftSessionId: shiftSessionId,
          status: status?.wireName,
          page: page,
          limit: limit,
        ),
      ),
    ),
    CashDrawer.fromJson,
  );

  Future<CashDrawer> openCashDrawer({
    String? tenantId,
    required String shiftSessionId,
    required int openingBalanceMinor,
    String currencyCode = 'INR',
    String? openingNotes,
  }) async => CashDrawer.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.cashDrawers,
        data: _payload({
          'tenantId': tenantId,
          'shiftSessionId': shiftSessionId,
          'currencyCode': currencyCode,
          'openingBalanceMinor': openingBalanceMinor,
          'openingNotes': openingNotes,
        }),
      ),
    ),
  );

  Future<CashDrawerTransaction> addCashDrawerTransaction({
    String? tenantId,
    required String drawerId,
    required CashDrawerTransactionType transactionType,
    required int amountMinor,
    String? note,
  }) async => CashDrawerTransaction.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.cashDrawerTransactions(drawerId),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({
          'transactionType': transactionType.wireName,
          'amountMinor': amountMinor,
          'note': note,
        }),
      ),
    ),
  );

  Future<CashDrawer> closeCashDrawer({
    String? tenantId,
    required String id,
    required int version,
    required int closingBalanceMinor,
    String? closingNotes,
  }) async => CashDrawer.fromJson(
    _map(
      await _dio.patch<Object?>(
        ApiEndpoints.cashDrawerClose(id),
        queryParameters: _payload({'tenantId': tenantId}),
        data: _payload({
          'version': version,
          'closingBalanceMinor': closingBalanceMinor,
          'closingNotes': closingNotes,
        }),
      ),
    ),
  );

  Future<List<CashDrawerTransaction>> getCashDrawerTransactions({
    String? tenantId,
    required String drawerId,
  }) async => _list(
    await _dio.get<Object?>(
      ApiEndpoints.cashDrawerTransactions(drawerId),
      queryParameters: _payload({'tenantId': tenantId}),
    ),
  ).map(CashDrawerTransaction.fromJson).toList(growable: false);

  Future<PaginatedResponse<ShiftReconciliation>> getShiftReconciliations({
    String? tenantId,
    String? outletId,
    String? businessDayId,
    String? shiftSessionId,
    String? cashDrawerId,
    int page = 1,
    int limit = 20,
  }) async => PaginatedResponse<ShiftReconciliation>.fromJson(
    _map(
      await _dio.get<Object?>(
        ApiEndpoints.shiftReconciliations,
        queryParameters: _query(
          tenantId: tenantId,
          outletId: outletId,
          businessDayId: businessDayId,
          shiftSessionId: shiftSessionId,
          cashDrawerId: cashDrawerId,
          page: page,
          limit: limit,
        ),
      ),
    ),
    ShiftReconciliation.fromJson,
  );

  Future<ShiftReconciliation> createShiftReconciliation({
    String? tenantId,
    required String shiftSessionId,
    required String cashDrawerId,
    required int countedCashMinor,
    String? approvalNotes,
  }) async => ShiftReconciliation.fromJson(
    _map(
      await _dio.post<Object?>(
        ApiEndpoints.shiftReconciliations,
        data: _payload({
          'tenantId': tenantId,
          'shiftSessionId': shiftSessionId,
          'cashDrawerId': cashDrawerId,
          'countedCashMinor': countedCashMinor,
          'approvalNotes': approvalNotes,
        }),
      ),
    ),
  );
}

Map<String, dynamic> _query({
  String? tenantId,
  String? outletId,
  String? businessDayId,
  String? shiftSessionId,
  String? cashDrawerId,
  String? assignedUserId,
  String? status,
  DateTime? businessDate,
  required int page,
  required int limit,
}) => _payload({
  'tenantId': tenantId,
  'outletId': outletId,
  'businessDayId': businessDayId,
  'shiftSessionId': shiftSessionId,
  'cashDrawerId': cashDrawerId,
  'assignedUserId': assignedUserId,
  'status': status,
  'businessDate': businessDate == null ? null : _dateOnly(businessDate),
  'page': page,
  'limit': limit,
});

Map<String, dynamic> _map(Response<Object?> response) {
  if (response.data is Map) {
    return Map<String, dynamic>.from(response.data! as Map);
  }
  throw const FormatException('Expected an object response.');
}

List<Map<String, dynamic>> _list(Response<Object?> response) {
  final data = response.data;
  if (data is List) {
    return data
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);
  }
  throw const FormatException('Expected a list response.');
}

Map<String, dynamic> _payload(Map<String, dynamic> values) =>
    Map<String, dynamic>.fromEntries(
      values.entries.where((entry) => entry.value != null),
    );

String _dateOnly(DateTime value) =>
    value.toUtc().toIso8601String().split('T').first;
