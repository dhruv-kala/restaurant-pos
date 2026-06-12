import 'package:flutter/material.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'user_form_screen.dart';

class EditUserScreen extends StatelessWidget {
  const EditUserScreen({required this.user, super.key});
  final AppUser user;
  @override
  Widget build(BuildContext context) => UserFormScreen(user: user);
}
