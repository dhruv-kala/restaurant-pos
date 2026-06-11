import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/table_query.dart';

class TablesRepository {
  const TablesRepository(this._api);
  final TablesApiService _api;

  Future<PaginatedResponse<TableSection>> sections(TableQuery query) {
    return _api.getSections(
      page: query.page,
      limit: query.limit,
      outletId: query.outletId,
      search: query.search,
    );
  }

  Future<PaginatedResponse<DiningTable>> tables(TableQuery query) {
    return _api.getTables(
      page: query.page,
      limit: query.limit,
      outletId: query.outletId,
      sectionId: query.sectionId,
      search: query.search,
      status: query.status,
    );
  }

  Future<PaginatedResponse<TableReservation>> reservations(
    ReservationQuery query,
  ) {
    return _api.getReservations(
      page: query.page,
      limit: query.limit,
      outletId: query.outletId,
      search: query.search,
      status: query.status,
      date: query.date,
    );
  }

  Future<TableSection> saveSection({
    String? id,
    required Map<String, dynamic> payload,
  }) => id == null
      ? _api.createSection(payload)
      : _api.updateSection(id, payload);

  Future<DiningTable> saveTable({
    String? id,
    required Map<String, dynamic> payload,
  }) => id == null ? _api.createTable(payload) : _api.updateTable(id, payload);

  Future<TableReservation> saveReservation({
    String? id,
    required Map<String, dynamic> payload,
  }) => id == null
      ? _api.createReservation(payload)
      : _api.updateReservation(id, payload);
}
