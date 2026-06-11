import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class TablesApiService {
  const TablesApiService(this._dio);
  final Dio _dio;

  Future<PaginatedResponse<TableSection>> getSections({
    int page = 1,
    int limit = 100,
    String? outletId,
    String? search,
  }) => _getPage(
    ApiEndpoints.tableSections,
    TableSection.fromJson,
    page: page,
    limit: limit,
    outletId: outletId,
    search: search,
  );

  Future<TableSection> createSection(Map<String, dynamic> data) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.tableSections,
      data: data,
    );
    return TableSection.fromJson(_map(response));
  }

  Future<TableSection> updateSection(
    String id,
    Map<String, dynamic> data,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.tableSection(id),
      data: data,
    );
    return TableSection.fromJson(_map(response));
  }

  Future<void> deleteSection(String id) =>
      _dio.delete<Object?>(ApiEndpoints.tableSection(id));

  Future<PaginatedResponse<DiningTable>> getTables({
    int page = 1,
    int limit = 100,
    String? outletId,
    String? sectionId,
    DiningTableStatus? status,
    String? search,
  }) => _getPage(
    ApiEndpoints.tables,
    DiningTable.fromJson,
    page: page,
    limit: limit,
    outletId: outletId,
    sectionId: sectionId,
    status: status?.wireName,
    search: search,
  );

  Future<DiningTable> createTable(Map<String, dynamic> data) async {
    final response = await _dio.post<Object?>(ApiEndpoints.tables, data: data);
    return DiningTable.fromJson(_map(response));
  }

  Future<DiningTable> updateTable(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.table(id),
      data: data,
    );
    return DiningTable.fromJson(_map(response));
  }

  Future<DiningTable> updateTableStatus(
    String id,
    DiningTableStatus status,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.tableStatus(id),
      data: <String, String>{'status': status.wireName},
    );
    return DiningTable.fromJson(_map(response));
  }

  Future<void> deleteTable(String id) =>
      _dio.delete<Object?>(ApiEndpoints.table(id));

  Future<MergedTable> mergeTables(List<String> tableIds) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.mergeTables,
      data: <String, Object>{'tableIds': tableIds},
    );
    return MergedTable.fromJson(_map(response));
  }

  Future<MergedTable> splitTables(String mergedTableId) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.splitTables,
      data: <String, String>{'mergedTableId': mergedTableId},
    );
    return MergedTable.fromJson(_map(response));
  }

  Future<DiningTable> transferTable({
    required String sourceTableId,
    required String targetTableId,
  }) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.transferTable,
      data: <String, String>{
        'sourceTableId': sourceTableId,
        'targetTableId': targetTableId,
      },
    );
    return DiningTable.fromJson(_map(response));
  }

  Future<PaginatedResponse<TableReservation>> getReservations({
    int page = 1,
    int limit = 100,
    String? outletId,
    ReservationStatus? status,
    DateTime? date,
    String? search,
  }) => _getPage(
    ApiEndpoints.reservations,
    TableReservation.fromJson,
    page: page,
    limit: limit,
    outletId: outletId,
    status: status?.wireName,
    reservationDate: date?.toUtc().toIso8601String(),
    search: search,
  );

  Future<TableReservation> createReservation(Map<String, dynamic> data) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.reservations,
      data: data,
    );
    return TableReservation.fromJson(_map(response));
  }

  Future<TableReservation> updateReservation(
    String id,
    Map<String, dynamic> data,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.reservation(id),
      data: data,
    );
    return TableReservation.fromJson(_map(response));
  }

  Future<TableReservation> updateReservationStatus(
    String id,
    ReservationStatus status,
  ) async {
    final response = await _dio.patch<Object?>(
      ApiEndpoints.reservationStatus(id),
      data: <String, String>{'status': status.wireName},
    );
    return TableReservation.fromJson(_map(response));
  }

  Future<void> deleteReservation(String id) =>
      _dio.delete<Object?>(ApiEndpoints.reservation(id));

  Future<PaginatedResponse<T>> _getPage<T>(
    String path,
    T Function(Map<String, dynamic>) fromJson, {
    required int page,
    required int limit,
    String? outletId,
    String? sectionId,
    String? status,
    String? reservationDate,
    String? search,
  }) async {
    final response = await _dio.get<Object?>(
      path,
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (outletId != null && outletId.isNotEmpty) 'outletId': outletId,
        if (sectionId != null) 'sectionId': sectionId,
        if (status != null) 'status': status,
        if (reservationDate != null) 'reservationDate': reservationDate,
        if (search != null && search.isNotEmpty) 'search': search,
      },
    );
    return PaginatedResponse<T>.fromJson(_map(response), fromJson);
  }
}

Map<String, dynamic> _map(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) return data;
  throw const FormatException('Expected an object response.');
}
