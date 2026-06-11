import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/dashboard/presentation/screens/admin_dashboard.dart';
import '../../features/dashboard/presentation/screens/cashier_dashboard.dart';
import '../../features/dashboard/presentation/screens/customer_dashboard.dart';
import '../../features/dashboard/presentation/screens/kitchen_dashboard.dart';
import '../../features/dashboard/presentation/screens/manager_dashboard.dart';
import '../../features/dashboard/presentation/screens/super_admin_dashboard.dart';
import '../../features/dashboard/presentation/screens/waiter_dashboard.dart';

abstract final class AppRoutes {
  static const splash = '/splash';
  static const login = '/login';
  static const dashboard = '/dashboard';
  static const superAdminDashboard = '/dashboard/super-admin';
  static const adminDashboard = '/dashboard/admin';
  static const managerDashboard = '/dashboard/manager';
  static const cashierDashboard = '/dashboard/cashier';
  static const waiterDashboard = '/dashboard/waiter';
  static const kitchenDashboard = '/dashboard/kitchen';
  static const customerDashboard = '/dashboard/customer';

  static String forRole(UserRole role) {
    return switch (role) {
      UserRole.superAdmin => superAdminDashboard,
      UserRole.tenantAdmin => adminDashboard,
      UserRole.manager => managerDashboard,
      UserRole.cashier => cashierDashboard,
      UserRole.waiter => waiterDashboard,
      UserRole.kitchenStaff => kitchenDashboard,
      UserRole.customer => customerDashboard,
    };
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);
  final router = GoRouter(
    initialLocation: AppRoutes.splash,
    redirect: (context, state) {
      final location = state.matchedLocation;
      final isResolving =
          authState.status == AuthStatus.initial ||
          authState.status == AuthStatus.loading;
      if (isResolving) {
        return location == AppRoutes.splash ? null : AppRoutes.splash;
      }

      if (authState.status == AuthStatus.unauthenticated) {
        return location == AppRoutes.login ? null : AppRoutes.login;
      }

      final user = authState.user;
      final role = user == null ? null : RoleAccess.primaryRole(user.roles);
      if (authState.status != AuthStatus.authenticated || role == null) {
        return AppRoutes.login;
      }

      final roleRoute = AppRoutes.forRole(role);
      if (location == AppRoutes.login ||
          location == AppRoutes.splash ||
          location == AppRoutes.dashboard ||
          (location.startsWith('${AppRoutes.dashboard}/') &&
              location != roleRoute)) {
        return roleRoute;
      }
      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.dashboard,
        builder: (context, state) => const SplashScreen(),
        routes: <RouteBase>[
          GoRoute(
            path: 'super-admin',
            builder: (context, state) => const SuperAdminDashboard(),
          ),
          GoRoute(
            path: 'admin',
            builder: (context, state) => const AdminDashboard(),
          ),
          GoRoute(
            path: 'manager',
            builder: (context, state) => const ManagerDashboard(),
          ),
          GoRoute(
            path: 'cashier',
            builder: (context, state) => const CashierDashboard(),
          ),
          GoRoute(
            path: 'waiter',
            builder: (context, state) => const WaiterDashboard(),
          ),
          GoRoute(
            path: 'kitchen',
            builder: (context, state) => const KitchenDashboard(),
          ),
          GoRoute(
            path: 'customer',
            builder: (context, state) => const CustomerDashboard(),
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
