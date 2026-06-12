import 'package:flutter/material.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'employee_form_screen.dart';

class EditEmployeeScreen extends StatelessWidget {
  const EditEmployeeScreen({required this.employee, super.key});
  final EmployeeProfile employee;
  @override
  Widget build(BuildContext context) => EmployeeFormScreen(employee: employee);
}
