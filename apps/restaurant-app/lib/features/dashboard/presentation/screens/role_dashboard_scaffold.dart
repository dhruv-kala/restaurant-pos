import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_ui_kit/restaurant_pos_ui_kit.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/router/app_router.dart';

class RoleDashboardScaffold extends ConsumerWidget {
  const RoleDashboardScaffold({required this.roleName, super.key});

  final String roleName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: Text('$roleName Dashboard'),
        actions: <Widget>[
          TextButton.icon(
            onPressed: authState.status == AuthStatus.loading
                ? null
                : ref.read(authNotifierProvider.notifier).logout,
            icon: const Icon(Icons.logout),
            label: const Text('Logout'),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: AppCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(roleName, style: AppTextStyles.headline),
                const SizedBox(height: 20),
                _Detail(label: 'User', value: user?.name ?? 'Unknown'),
                _Detail(label: 'Email', value: user?.email ?? 'Unknown'),
                _Detail(label: 'Tenant', value: user?.tenantId ?? 'Platform'),
                _Detail(
                  label: 'Outlet',
                  value: user?.outletId ?? 'Not assigned',
                ),
                if (roleName != 'Customer' && roleName != 'Super Admin')
                  FilledButton.icon(
                    onPressed: () => context.push(
                      roleName == 'Kitchen Staff'
                          ? AppRoutes.kitchenQueue
                          : AppRoutes.orders,
                    ),
                    icon: const Icon(Icons.receipt_long),
                    label: Text(
                      roleName == 'Kitchen Staff'
                          ? 'Open Kitchen Queue'
                          : 'Open Orders',
                    ),
                  ),
                if (roleName == 'Manager' || roleName == 'Waiter')
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: OutlinedButton.icon(
                      onPressed: () => context.push(
                        roleName == 'Waiter'
                            ? AppRoutes.readyOrders
                            : AppRoutes.kds,
                      ),
                      icon: const Icon(Icons.soup_kitchen),
                      label: Text(
                        roleName == 'Waiter'
                            ? 'View Ready Orders'
                            : 'View Kitchen',
                      ),
                    ),
                  ),
                if (roleName == 'Tenant Admin' ||
                    roleName == 'Manager' ||
                    roleName == 'Cashier' ||
                    roleName == 'Waiter')
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: OutlinedButton.icon(
                      onPressed: () => context.push(AppRoutes.billing),
                      icon: const Icon(Icons.receipt),
                      label: const Text('Open Billing'),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(width: 90, child: Text(label, style: AppTextStyles.label)),
          Expanded(child: Text(value, style: AppTextStyles.body)),
        ],
      ),
    );
  }
}
