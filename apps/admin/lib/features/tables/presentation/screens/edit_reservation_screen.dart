import 'package:flutter/material.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'reservation_form_screen.dart';

class EditReservationScreen extends StatelessWidget {
  const EditReservationScreen({required this.reservation, super.key});
  final TableReservation reservation;
  @override
  Widget build(BuildContext context) =>
      ReservationFormScreen(reservation: reservation);
}
