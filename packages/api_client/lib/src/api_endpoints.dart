abstract final class ApiEndpoints {
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String currentUser = '/auth/me';
  static const String tenants = '/tenants';
  static const String outlets = '/outlets';
  static const String menuCategories = '/menu/categories';
  static const String menuItems = '/menu/items';

  static String tenant(String tenantId) => '$tenants/$tenantId';

  static String tenantStatus(String tenantId) => '${tenant(tenantId)}/status';

  static String tenantOutlets(String tenantId) {
    return '${tenant(tenantId)}/outlets';
  }

  static String outlet(String outletId) => '$outlets/$outletId';

  static String outletStatus(String outletId) => '${outlet(outletId)}/status';

  static String menuCategory(String categoryId) {
    return '$menuCategories/$categoryId';
  }

  static String menuItem(String itemId) => '$menuItems/$itemId';

  static String menuItemVariants(String itemId) {
    return '${menuItem(itemId)}/variants';
  }

  static String menuItemAddons(String itemId) {
    return '${menuItem(itemId)}/addons';
  }

  static String menuVariant(String variantId) => '/menu/variants/$variantId';

  static String menuAddon(String addonId) => '/menu/addons/$addonId';
}
