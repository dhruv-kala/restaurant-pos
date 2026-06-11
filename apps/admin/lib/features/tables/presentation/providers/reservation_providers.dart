import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../domain/table_query.dart';
import 'table_providers.dart';

final reservationsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<TableReservation>, ReservationQuery>((
      ref,
      query,
    ) {
      return ref.watch(tablesRepositoryProvider).reservations(query);
    });
