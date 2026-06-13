import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import 'communication_dashboard_screen.dart';
import 'communication_history_screen.dart';
import 'communication_providers_screen.dart';
import 'communication_templates_screen.dart';

class CommunicationCenterScreen extends ConsumerWidget {
  const CommunicationCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;
    final isAdmin =
        user?.hasRole(UserRole.superAdmin) == true ||
        user?.hasRole(UserRole.tenantAdmin) == true;
    final canViewHistory =
        isAdmin || user?.hasPermission('communication.history_view') == true;
    final canViewAnalytics =
        isAdmin || user?.hasPermission('communication.analytics_view') == true;
    final canViewTemplates =
        isAdmin ||
        user?.hasPermission('communication.template_view') == true ||
        user?.hasPermission('communication.template_manage') == true;
    final canViewProviders =
        isAdmin ||
        user?.hasPermission('communication.provider_view') == true ||
        user?.hasPermission('communication.provider_manage') == true;
    final tabs = <Tab>[
      if (canViewAnalytics)
        const Tab(icon: Icon(Icons.dashboard_outlined), text: 'Dashboard'),
      if (canViewTemplates)
        const Tab(icon: Icon(Icons.article_outlined), text: 'Templates'),
      if (canViewHistory) const Tab(icon: Icon(Icons.history), text: 'History'),
      if (canViewProviders)
        const Tab(icon: Icon(Icons.hub_outlined), text: 'Providers'),
    ];
    final views = <Widget>[
      if (canViewAnalytics) const CommunicationDashboardScreen(),
      if (canViewTemplates) const CommunicationTemplatesScreen(),
      if (canViewHistory) const CommunicationHistoryScreen(),
      if (canViewProviders) const CommunicationProvidersScreen(),
    ];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Communication Center'),
          bottom: TabBar(isScrollable: true, tabs: tabs),
        ),
        body: TabBarView(children: views),
      ),
    );
  }
}
