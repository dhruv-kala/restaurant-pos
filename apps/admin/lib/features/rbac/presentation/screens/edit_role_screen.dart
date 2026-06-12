import 'package:flutter/material.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'role_form_screen.dart';

class EditRoleScreen extends StatelessWidget {
  const EditRoleScreen({required this.role, super.key});
  final Role role;
  @override
  Widget build(BuildContext context) => RoleFormScreen(role: role);
}
