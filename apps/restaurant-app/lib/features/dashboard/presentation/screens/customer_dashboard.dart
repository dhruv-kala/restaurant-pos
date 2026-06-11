import 'package:flutter/widgets.dart';

import 'role_dashboard_scaffold.dart';

class CustomerDashboard extends StatelessWidget {
  const CustomerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const RoleDashboardScaffold(roleName: 'Customer');
  }
}
