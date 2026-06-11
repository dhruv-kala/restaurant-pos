import 'package:flutter/widgets.dart';

import 'role_dashboard_scaffold.dart';

class SuperAdminDashboard extends StatelessWidget {
  const SuperAdminDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const RoleDashboardScaffold(roleName: 'Super Admin');
  }
}
