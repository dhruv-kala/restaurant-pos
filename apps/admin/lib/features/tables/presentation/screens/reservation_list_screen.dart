import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import '../../domain/table_query.dart';
import '../providers/reservation_providers.dart';
import '../providers/table_providers.dart';
import 'add_reservation_screen.dart';

class ReservationListScreen extends ConsumerWidget {
  const ReservationListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ReservationQuery(outletId: ref.watch(activeOutletIdProvider));
    final reservations = ref.watch(reservationsProvider(query));
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: <Widget>[
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute<void>(
                  builder: (_) => const AddReservationScreen(),
                ),
              ),
              icon: const Icon(Icons.add),
              label: const Text('Add Reservation'),
            ),
          ),
          Expanded(
            child: reservations.when(
              loading: () => const AppLoading(),
              error: (error, stack) => AppEmptyState(
                title: 'Unable to load reservations',
                message: error.toString(),
              ),
              data: (response) => ListView(
                children: response.data
                    .map(
                      (reservation) => ListTile(
                        title: Text(reservation.customerName),
                        subtitle: Text(
                          '${reservation.guestCount} guests - '
                          '${reservation.reservationDate.toLocal()}',
                        ),
                        trailing: Text(reservation.status.wireName),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
