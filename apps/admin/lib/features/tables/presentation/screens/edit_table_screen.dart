import 'package:flutter/material.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'table_form_screen.dart';

class EditTableScreen extends StatelessWidget {
  const EditTableScreen({required this.table, super.key});
  final DiningTable table;
  @override
  Widget build(BuildContext context) => TableFormScreen(table: table);
}
