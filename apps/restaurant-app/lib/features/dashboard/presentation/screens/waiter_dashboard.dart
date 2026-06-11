import 'package:flutter/widgets.dart';

import 'role_dashboard_scaffold.dart';

class WaiterDashboard extends StatelessWidget {
  const WaiterDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const RoleDashboardScaffold(roleName: 'Waiter');
  }
}
