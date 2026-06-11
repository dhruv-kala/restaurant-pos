import 'package:flutter/widgets.dart';

import 'role_dashboard_scaffold.dart';

class CashierDashboard extends StatelessWidget {
  const CashierDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return const RoleDashboardScaffold(roleName: 'Cashier');
  }
}
