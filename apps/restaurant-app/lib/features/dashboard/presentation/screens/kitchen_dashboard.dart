import 'package:flutter/widgets.dart';

import 'role_dashboard_scaffold.dart';

class KitchenDashboard extends StatelessWidget {
  const KitchenDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const RoleDashboardScaffold(roleName: 'Kitchen Staff');
  }
}
