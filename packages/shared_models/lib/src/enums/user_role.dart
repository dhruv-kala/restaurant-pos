enum UserRole {
  superAdmin,
  tenantAdmin,
  manager,
  cashier,
  waiter,
  kitchenStaff,
  inventoryManager,
  hrManager,
  customer;

  static UserRole fromJson(Object? value) {
    return switch (value) {
      'SUPER_ADMIN' => UserRole.superAdmin,
      'TENANT_ADMIN' || 'OWNER' || 'ADMIN' => UserRole.tenantAdmin,
      'MANAGER' => UserRole.manager,
      'CASHIER' => UserRole.cashier,
      'WAITER' => UserRole.waiter,
      'KITCHEN' || 'KITCHEN_STAFF' => UserRole.kitchenStaff,
      'INVENTORY_MANAGER' => UserRole.inventoryManager,
      'HR_MANAGER' => UserRole.hrManager,
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
      UserRole.inventoryManager => 'INVENTORY_MANAGER',
      UserRole.hrManager => 'HR_MANAGER',
      UserRole.customer => 'CUSTOMER',
    };
  }
}
