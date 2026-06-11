import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class TableQuery {
  const TableQuery({
    this.page = 1,
    this.limit = 100,
    this.outletId,
    this.sectionId,
    this.search,
    this.status,
  });

  final int page;
  final int limit;
  final String? outletId;
  final String? sectionId;
  final String? search;
  final DiningTableStatus? status;
}

class ReservationQuery {
  const ReservationQuery({
    this.page = 1,
    this.limit = 100,
    this.outletId,
    this.search,
    this.status,
    this.date,
  });

  final int page;
  final int limit;
  final String? outletId;
  final String? search;
  final ReservationStatus? status;
  final DateTime? date;
}
