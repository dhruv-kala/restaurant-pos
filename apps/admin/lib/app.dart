import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';

import 'features/menu/presentation/screens/menu_dashboard.dart';
import 'features/communication/presentation/screens/communication_center_screen.dart';
import 'features/notifications/presentation/screens/notification_center_screen.dart';
import 'features/audit/presentation/screens/audit_dashboard.dart';
import 'features/inventory/presentation/screens/inventory_dashboard.dart';
import 'features/customers/presentation/screens/customer_dashboard.dart';
import 'features/employees/presentation/screens/employee_dashboard.dart';
import 'features/recipes/presentation/screens/recipe_dashboard.dart';
import 'features/rbac/presentation/screens/user_management_dashboard.dart';
import 'features/reports/presentation/screens/reports_dashboard.dart';
import 'features/subscriptions/presentation/screens/subscription_admin_screen.dart';
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

class AdminDashboard extends ConsumerStatefulWidget {
  const AdminDashboard({super.key});

  @override
  ConsumerState<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends ConsumerState<AdminDashboard> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).user;
    final canManageRbac =
        user?.hasRole(UserRole.superAdmin) == true ||
        user?.hasRole(UserRole.tenantAdmin) == true ||
        user?.hasPermission('roles.update') == true ||
        user?.hasPermission('users.update') == true;
    final canViewAudit =
        user?.hasRole(UserRole.superAdmin) == true ||
        user?.hasRole(UserRole.tenantAdmin) == true ||
        user?.hasPermission('audit.read') == true;
    final canViewCommunication =
        user?.hasRole(UserRole.superAdmin) == true ||
        user?.hasRole(UserRole.tenantAdmin) == true ||
        user?.hasPermission('communication.history_view') == true ||
        user?.hasPermission('communication.analytics_view') == true ||
        user?.hasPermission('communication.template_view') == true ||
        user?.hasPermission('communication.template_manage') == true ||
        user?.hasPermission('communication.provider_view') == true ||
        user?.hasPermission('communication.provider_manage') == true;
    final canViewSubscriptions =
        user?.hasRole(UserRole.superAdmin) == true ||
        user?.hasRole(UserRole.tenantAdmin) == true ||
        user?.hasPermission('subscription.read') == true ||
        user?.hasPermission('subscription.plan.read') == true ||
        user?.hasPermission('subscription.plan.manage') == true ||
        user?.hasPermission('subscription.lifecycle.read') == true ||
        user?.hasPermission('subscription.lifecycle.manage') == true ||
        user?.hasPermission('subscription.entitlement.read') == true ||
        user?.hasPermission('subscription.entitlement.manage') == true ||
        user?.hasPermission('subscription.usage.read') == true ||
        user?.hasPermission('subscription.usage.manage') == true ||
        user?.hasPermission('subscription.trial.read') == true ||
        user?.hasPermission('subscription.trial.manage') == true;
    final screens = <Widget>[
      const MenuDashboard(),
      const TableLayoutScreen(),
      const InventoryDashboard(),
      const RecipeDashboard(),
      const CustomerDashboard(),
      const ReportsDashboard(),
      const EmployeeDashboard(),
      const NotificationCenterScreen(),
      if (canViewCommunication) const CommunicationCenterScreen(),
      if (canViewSubscriptions) const SubscriptionAdminScreen(),
      if (canManageRbac) const UserManagementDashboard(),
      if (canViewAudit) const AuditDashboard(),
    ];
    final destinations = <NavigationDestination>[
      const NavigationDestination(
        icon: Icon(Icons.restaurant_menu),
        label: 'Menu',
      ),
      const NavigationDestination(
        icon: Icon(Icons.table_restaurant),
        label: 'Tables',
      ),
      const NavigationDestination(
        icon: Icon(Icons.inventory),
        label: 'Inventory',
      ),
      const NavigationDestination(
        icon: Icon(Icons.menu_book),
        label: 'Recipes',
      ),
      const NavigationDestination(icon: Icon(Icons.people), label: 'Customers'),
      const NavigationDestination(
        icon: Icon(Icons.analytics),
        label: 'Reports',
      ),
      const NavigationDestination(icon: Icon(Icons.badge), label: 'Employees'),
      const NavigationDestination(
        icon: Icon(Icons.notifications),
        label: 'Notifications',
      ),
      if (canViewCommunication)
        const NavigationDestination(
          icon: Icon(Icons.outgoing_mail),
          label: 'Communication',
        ),
      if (canViewSubscriptions)
        const NavigationDestination(
          icon: Icon(Icons.workspace_premium),
          label: 'Subscriptions',
        ),
      if (canManageRbac)
        const NavigationDestination(
          icon: Icon(Icons.admin_panel_settings),
          label: 'Access',
        ),
      if (canViewAudit)
        const NavigationDestination(icon: Icon(Icons.history), label: 'Audit'),
    ];
    return Scaffold(
      body: screens[_index.clamp(0, screens.length - 1)],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index.clamp(0, destinations.length - 1),
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: destinations,
      ),
    );
  }
}
