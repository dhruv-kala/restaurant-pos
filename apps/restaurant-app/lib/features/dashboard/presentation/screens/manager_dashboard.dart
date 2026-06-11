import 'package:flutter/widgets.dart';

import 'role_dashboard_scaffold.dart';

class ManagerDashboard extends StatelessWidget {
  const ManagerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const RoleDashboardScaffold(roleName: 'Manager');
  }
}
