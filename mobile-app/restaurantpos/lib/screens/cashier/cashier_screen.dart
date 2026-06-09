import 'package:flutter/material.dart';

class CashierScreen extends StatelessWidget {
  const CashierScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text(
          "CASHIER POS SCREEN",
          style: TextStyle(fontSize: 30),
        ),
      ),
    );
  }
}