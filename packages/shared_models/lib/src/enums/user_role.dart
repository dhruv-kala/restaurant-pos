enum UserRole {
  superAdmin,
  tenantAdmin,
  manager,
  cashier,
  waiter,
  kitchenStaff,
  customer;

  static UserRole fromJson(Object? value) {
    return switch (value) {
      'SUPER_ADMIN' => UserRole.superAdmin,
      'TENANT_ADMIN' || 'OWNER' || 'ADMIN' => UserRole.tenantAdmin,
      'MANAGER' => UserRole.manager,
      'CASHIER' => UserRole.cashier,
      'WAITER' => UserRole.waiter,
      'KITCHEN' || 'KITCHEN_STAFF' => UserRole.kitchenStaff,
      'CUSTOMER' => UserRole.customer,
      _ => throw FormatException('Unsupported user role: $value'),
    };
  }

  String toJson() {
    return switch (this) {
      UserRole.superAdmin => 'SUPER_ADMIN',
      UserRole.tenantAdmin => 'TENANT_ADMIN',
      UserRole.manager => 'MANAGER',
      UserRole.cashier => 'CASHIER',
      UserRole.waiter => 'WAITER',
      UserRole.kitchenStaff => 'KITCHEN_STAFF',
      UserRole.customer => 'CUSTOMER',
    };
  }
}
