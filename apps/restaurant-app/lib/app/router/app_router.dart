import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart' hide UserRole;
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/billing/presentation/screens/bill_details_screen.dart';
import '../../features/billing/presentation/screens/bill_list_screen.dart';
import '../../features/billing/presentation/screens/billing_screen.dart';
import '../../features/billing/presentation/screens/merge_bill_screen.dart';
import '../../features/billing/presentation/screens/split_bill_screen.dart';
import '../../features/dashboard/presentation/screens/admin_dashboard.dart';
import '../../features/dashboard/presentation/screens/cashier_dashboard.dart';
import '../../features/dashboard/presentation/screens/customer_dashboard.dart';
import '../../features/dashboard/presentation/screens/kitchen_dashboard.dart';
import '../../features/dashboard/presentation/screens/manager_dashboard.dart';
import '../../features/dashboard/presentation/screens/super_admin_dashboard.dart';
import '../../features/dashboard/presentation/screens/waiter_dashboard.dart';
import '../../features/orders/presentation/screens/create_order_screen.dart';
import '../../features/orders/presentation/screens/edit_order_screen.dart';
import '../../features/kds/presentation/screens/completed_orders_screen.dart';
import '../../features/kds/presentation/screens/kitchen_dashboard_screen.dart';
import '../../features/kds/presentation/screens/kitchen_queue_screen.dart';
import '../../features/kds/presentation/screens/ready_orders_screen.dart';
import '../../features/orders/presentation/screens/order_details_screen.dart';
import '../../features/orders/presentation/screens/order_list_screen.dart';
import '../../features/payments/presentation/screens/payment_details_screen.dart';
import '../../features/payments/presentation/screens/payment_history_screen.dart';
import '../../features/payments/presentation/screens/payment_screen.dart';
import '../../features/payments/presentation/screens/refund_screen.dart';
import '../../features/payments/presentation/screens/split_payment_screen.dart';
import '../../features/receipts/presentation/screens/invoice_preview_screen.dart';
import '../../features/receipts/presentation/screens/print_receipt_screen.dart';
import '../../features/receipts/presentation/screens/receipt_history_screen.dart';
import '../../features/receipts/presentation/screens/receipt_screen.dart';

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
  static const orders = '/orders';
  static const createOrder = '/orders/create';
  static const kds = '/kds';
  static const kitchenQueue = '/kds/queue';
  static const readyOrders = '/kds/ready';
  static const completedOrders = '/kds/completed';
  static const billing = '/billing';
  static const mergeBills = '/billing/merge';
  static const payments = '/payments';
  static const receipts = '/receipts';

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
      if (location.startsWith(AppRoutes.orders)) {
        if (role == UserRole.customer) return roleRoute;
        if (role == UserRole.kitchenStaff &&
            location != AppRoutes.kitchenQueue) {
          return AppRoutes.kitchenQueue;
        }
      }
      if (location.startsWith(AppRoutes.kds)) {
        if (role == UserRole.customer || role == UserRole.cashier) {
          return roleRoute;
        }
        if (role == UserRole.waiter && location != AppRoutes.readyOrders) {
          return AppRoutes.readyOrders;
        }
      }
      if (location.startsWith(AppRoutes.billing)) {
        if (role == UserRole.customer || role == UserRole.kitchenStaff) {
          return roleRoute;
        }
        if (role == UserRole.waiter &&
            (location.contains('/generate/') ||
                location == AppRoutes.mergeBills ||
                location.endsWith('/split'))) {
          return AppRoutes.billing;
        }
      }
      if (location.startsWith(AppRoutes.payments)) {
        if (role == UserRole.customer || role == UserRole.kitchenStaff) {
          return roleRoute;
        }
        if (role == UserRole.waiter &&
            (location.contains('/pay/') ||
                location.contains('/split/') ||
                location.endsWith('/refund'))) {
          return AppRoutes.payments;
        }
      }
      if (location.startsWith(AppRoutes.receipts) &&
          (role == UserRole.customer || role == UserRole.kitchenStaff)) {
        return roleRoute;
      }
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
      GoRoute(
        path: AppRoutes.orders,
        builder: (context, state) => const OrderListScreen(),
        routes: <RouteBase>[
          GoRoute(
            path: 'create',
            builder: (context, state) => const CreateOrderScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) =>
                OrderDetailsScreen(orderId: state.pathParameters['id']!),
            routes: <RouteBase>[
              GoRoute(
                path: 'edit',
                builder: (context, state) =>
                    EditOrderScreen(orderId: state.pathParameters['id']!),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.kds,
        builder: (context, state) => const KitchenDashboardScreen(),
        routes: <RouteBase>[
          GoRoute(
            path: 'queue',
            builder: (context, state) => Scaffold(
              appBar: AppBar(title: const Text('Kitchen Queue')),
              body: const KdsQueueScreen(),
            ),
          ),
          GoRoute(
            path: 'ready',
            builder: (context, state) => Scaffold(
              appBar: AppBar(title: const Text('Ready Orders')),
              body: const ReadyOrdersScreen(),
            ),
          ),
          GoRoute(
            path: 'completed',
            builder: (context, state) => Scaffold(
              appBar: AppBar(title: const Text('Completed Orders')),
              body: const CompletedOrdersScreen(),
            ),
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.billing,
        builder: (context, state) => const BillListScreen(),
        routes: <RouteBase>[
          GoRoute(
            path: 'generate/:orderId',
            builder: (context, state) =>
                BillingScreen(orderId: state.pathParameters['orderId']!),
          ),
          GoRoute(
            path: 'merge',
            builder: (context, state) => const MergeBillScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) =>
                BillDetailsScreen(billId: state.pathParameters['id']!),
            routes: <RouteBase>[
              GoRoute(
                path: 'split',
                builder: (context, state) =>
                    SplitBillScreen(billId: state.pathParameters['id']!),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.payments,
        builder: (context, state) => const PaymentHistoryScreen(),
        routes: <RouteBase>[
          GoRoute(
            path: 'pay/:billId',
            builder: (context, state) =>
                PaymentScreen(billId: state.pathParameters['billId']!),
          ),
          GoRoute(
            path: 'split/:billId',
            builder: (context, state) =>
                SplitPaymentScreen(billId: state.pathParameters['billId']!),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) =>
                PaymentDetailsScreen(paymentId: state.pathParameters['id']!),
            routes: <RouteBase>[
              GoRoute(
                path: 'refund',
                builder: (context, state) =>
                    RefundScreen(paymentId: state.pathParameters['id']!),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.receipts,
        builder: (context, state) => const ReceiptHistoryScreen(),
        routes: <RouteBase>[
          GoRoute(
            path: ':id',
            builder: (context, state) =>
                ReceiptScreen(receiptId: state.pathParameters['id']!),
            routes: <RouteBase>[
              GoRoute(
                path: 'preview',
                builder: (context, state) => InvoicePreviewScreen(
                  receiptId: state.pathParameters['id']!,
                ),
              ),
              GoRoute(
                path: 'print',
                builder: (context, state) =>
                    PrintReceiptScreen(receiptId: state.pathParameters['id']!),
              ),
            ],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
