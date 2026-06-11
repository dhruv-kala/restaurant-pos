import 'package:flutter/widgets.dart';

import 'role_dashboard_scaffold.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const RoleDashboardScaffold(roleName: 'Tenant Admin');
  }
}
