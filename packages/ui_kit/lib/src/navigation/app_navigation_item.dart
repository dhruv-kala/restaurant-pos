import 'package:flutter/material.dart';

class AppNavigationItem {
  const AppNavigationItem({required this.icon, required this.label});

  final IconData icon;
  final String label;
}

const defaultAppNavigationItems = [
  AppNavigationItem(icon: Icons.dashboard_rounded, label: 'Dashboard'),
  AppNavigationItem(icon: Icons.point_of_sale_rounded, label: 'POS'),
  AppNavigationItem(icon: Icons.table_restaurant_rounded, label: 'Tables'),
  AppNavigationItem(icon: Icons.restaurant_menu_rounded, label: 'Kitchen'),
  AppNavigationItem(icon: Icons.inventory_2_rounded, label: 'Inventory'),
  AppNavigationItem(icon: Icons.menu_book_rounded, label: 'Menu'),
  AppNavigationItem(icon: Icons.people_rounded, label: 'Customers'),
  AppNavigationItem(icon: Icons.bar_chart_rounded, label: 'Reports'),
  AppNavigationItem(icon: Icons.settings_rounded, label: 'Settings'),
];
