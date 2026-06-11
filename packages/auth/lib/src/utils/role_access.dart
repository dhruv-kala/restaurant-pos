import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

abstract final class RoleAccess {
  static bool isPlatformAdmin(Iterable<UserRole> roles) {
    return roles.contains(UserRole.superAdmin);
  }

  static bool canManageTenant(Iterable<UserRole> roles) {
    return roles.any(
      (role) => role == UserRole.superAdmin || role == UserRole.tenantAdmin,
    );
  }

  static bool canManageOutlet(Iterable<UserRole> roles) {
    return roles.any(
      (role) =>
          role == UserRole.superAdmin ||
          role == UserRole.tenantAdmin ||
          role == UserRole.manager,
    );
  }

  static bool canOperatePos(Iterable<UserRole> roles) {
    return roles.any(
      (role) =>
          role == UserRole.tenantAdmin ||
          role == UserRole.manager ||
          role == UserRole.cashier ||
          role == UserRole.waiter,
    );
  }
}
