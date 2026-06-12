import 'package:flutter/material.dart';
import 'customer_form_screen.dart';

class EditCustomerScreen extends StatelessWidget {
  const EditCustomerScreen({required this.customerId, super.key});
  final String customerId;
  @override
  Widget build(BuildContext context) =>
      CustomerFormScreen(customerId: customerId);
}
