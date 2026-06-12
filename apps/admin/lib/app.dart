import 'package:flutter/material.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import 'features/menu/presentation/screens/menu_dashboard.dart';
import 'features/inventory/presentation/screens/inventory_dashboard.dart';
import 'features/customers/presentation/screens/customer_dashboard.dart';
import 'features/employees/presentation/screens/employee_dashboard.dart';
import 'features/recipes/presentation/screens/recipe_dashboard.dart';
import 'features/reports/presentation/screens/reports_dashboard.dart';
import 'features/tables/presentation/screens/table_layout_screen.dart';

class AdminApp extends StatelessWidget {
  const AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'ServeIQ Admin',
      theme: AppTheme.lightTheme,
      home: const AdminDashboard(),
    );
  }
}

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const <Widget>[
          MenuDashboard(),
          TableLayoutScreen(),
          InventoryDashboard(),
          RecipeDashboard(),
          CustomerDashboard(),
          ReportsDashboard(),
          EmployeeDashboard(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.restaurant_menu),
            label: 'Menu',
          ),
          NavigationDestination(
            icon: Icon(Icons.table_restaurant),
            label: 'Tables',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory),
            label: 'Inventory',
          ),
          NavigationDestination(icon: Icon(Icons.menu_book), label: 'Recipes'),
          NavigationDestination(icon: Icon(Icons.people), label: 'Customers'),
          NavigationDestination(icon: Icon(Icons.analytics), label: 'Reports'),
          NavigationDestination(icon: Icon(Icons.badge), label: 'Employees'),
        ],
      ),
    );
  }
}
