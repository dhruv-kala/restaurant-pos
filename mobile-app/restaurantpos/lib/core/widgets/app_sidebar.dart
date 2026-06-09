import 'package:flutter/material.dart';

class AppSidebar extends StatelessWidget {
  const AppSidebar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 260,
      color: Colors.white,
      child: Column(
        children: [
          const SizedBox(height: 30),

          const Text(
            'SERVEIQ',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 30),

          _menu(Icons.dashboard, 'Dashboard'),
          _menu(Icons.point_of_sale, 'POS Billing'),
          _menu(Icons.table_restaurant, 'Tables'),
          _menu(Icons.kitchen, 'Kitchen'),
          _menu(Icons.inventory_2, 'Inventory'),
          _menu(Icons.receipt_long, 'Orders'),
          _menu(Icons.people, 'Customers'),
          _menu(Icons.bar_chart, 'Reports'),
          _menu(Icons.settings, 'Settings'),
        ],
      ),
    );
  }

  Widget _menu(IconData icon, String title) {
    return Container(
      margin: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
      ),
    );
  }
}