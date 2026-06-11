abstract final class ApiEndpoints {
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String currentUser = '/auth/me';
  static const String tenants = '/tenants';
  static const String outlets = '/outlets';
  static const String menuCategories = '/menu/categories';
  static const String menuItems = '/menu/items';
  static const String tableSections = '/table-sections';
  static const String tables = '/tables';
  static const String reservations = '/reservations';
  static const String orders = '/orders';
  static const String kds = '/kds';
  static const String billing = '/billing';
  static const String payments = '/payments';
  static const String receipts = '/receipts';

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

  static String tableSection(String id) => '$tableSections/$id';
  static String table(String id) => '$tables/$id';
  static String tableStatus(String id) => '${table(id)}/status';
  static String reservation(String id) => '$reservations/$id';
  static String reservationStatus(String id) => '${reservation(id)}/status';
  static const String mergeTables = '$tables/merge';
  static const String splitTables = '$tables/split';
  static const String transferTable = '$tables/transfer';
  static String order(String id) => '$orders/$id';
  static String orderStatus(String id) => '${order(id)}/status';
  static String orderCancel(String id) => '${order(id)}/cancel';
  static String orderTransfer(String id) => '${order(id)}/transfer';
  static String orderItems(String id) => '${order(id)}/items';
  static String orderItem(String id) => '/order-items/$id';
  static const String kitchenQueue = '$orders/kitchen/queue';
  static const String kdsQueue = '$kds/queue';
  static const String kdsActive = '$kds/active';
  static const String kdsReady = '$kds/ready';
  static const String kdsCompleted = '$kds/completed';
  static const String kdsCategories = '$kds/categories';
  static String kdsCategory(String id) => '$kdsCategories/$id';
  static String kdsItemStart(String id) => '$kds/items/$id/start';
  static String kdsItemReady(String id) => '$kds/items/$id/ready';
  static String kdsItemServed(String id) => '$kds/items/$id/served';
  static String kdsOrderStart(String id) => '$kds/orders/$id/start';
  static String kdsOrderReady(String id) => '$kds/orders/$id/ready';
  static const String billingGenerate = '$billing/generate';
  static const String billingMerge = '$billing/merge';
  static String bill(String id) => '$billing/$id';
  static String billVoid(String id) => '${bill(id)}/void';
  static String billPrint(String id) => '${bill(id)}/print';
  static String billSplit(String id) => '${bill(id)}/split';
  static const String paymentsSplit = '$payments/split';
  static String payment(String id) => '$payments/$id';
  static String paymentStatus(String id) => '${payment(id)}/status';
  static String paymentRefund(String id) => '${payment(id)}/refund';
  static const String receiptsGenerate = '$receipts/generate';
  static const String invoices = '$receipts/invoices';
  static String receipt(String id) => '$receipts/$id';
  static String receiptPrint(String id) => '${receipt(id)}/print';
  static String receiptReprint(String id) => '${receipt(id)}/reprint';
  static String receiptPdf(String id) => '${receipt(id)}/pdf';
}
