import 'package:restaurant_pos_core/restaurant_pos_core.dart';

enum UserRole {
  admin,
  cashier,
  waiter;

  static UserRole fromRemoteValue(Object? value) {
    return switch (value) {
      'ADMIN' => UserRole.admin,
      'CASHIER' => UserRole.cashier,
      'WAITER' => UserRole.waiter,
      _ => throw AppException('This account has an unsupported role.'),
    };
  }
}

class AuthenticatedUser {
  const AuthenticatedUser({
    required this.id,
    required this.email,
    required this.role,
  });

  final String id;
  final String? email;
  final UserRole role;
}
