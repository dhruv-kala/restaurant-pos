import 'package:go_router/go_router.dart';

import '../../features/admin/presentation/screens/admin_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/pos/presentation/screens/cashier_screen.dart';
import '../../features/service/presentation/screens/waiter_screen.dart';

abstract final class AppRoutes {
  static const login = '/login';
  static const admin = '/admin';
  static const pos = '/pos';
  static const service = '/service';
}

class AppRouter {
  AppRouter();

  late final GoRouter config = GoRouter(
    initialLocation: AppRoutes.login,
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.admin,
        builder: (context, state) => const AdminScreen(),
      ),
      GoRoute(
        path: AppRoutes.pos,
        builder: (context, state) => const CashierScreen(),
      ),
      GoRoute(
        path: AppRoutes.service,
        builder: (context, state) => const WaiterScreen(),
      ),
    ],
  );
}
