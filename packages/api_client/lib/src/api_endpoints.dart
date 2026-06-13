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
  static const String kitchen = '/kitchen';
  static const String billing = '/billing';
  static const String payments = '/payments';
  static const String receipts = '/receipts';
  static const String inventory = '/inventory';
  static const String recipes = '/recipes';
  static const String productionRecipes = '/production-recipes';
  static const String consumption = '/consumption';
  static const String customers = '/customers';
  static const String employees = '/employees';
  static const String shifts = '/shifts';
  static const String attendance = '/attendance';
  static const String reports = '/reports';
  static const String dashboard = '/dashboard';
  static const String inventoryWastage = '/inventory/wastage';
  static const String rbacUsers = '/rbac/users';
  static const String rbacRoles = '/rbac/roles';
  static const String rbacPermissions = '/rbac/permissions';
  static const String rbacGroupedPermissions = '$rbacPermissions/grouped';
  static const String auditEvents = '/audit-events';
  static const String auditExport = '$auditEvents/export';
  static const String notifications = '/notifications';
  static const String notificationAdmin = '$notifications/admin';
  static const String notificationUnreadCount = '$notifications/unread-count';
  static const String notificationPreferences = '$notifications/preferences';
  static const String notificationReadAll = '$notifications/read-all';
  static const String communication = '/communication';
  static const String communicationProviders = '$communication/providers';
  static const String communicationTemplates = '$communication/templates';
  static const String communicationMessages = '$communication/messages';
  static const String communicationAnalytics = '$communication/analytics';
  static const String subscriptions = '/subscriptions';
  static const String subscriptionPlans = '$subscriptions/plans';
  static const String subscriptionTenants = '$subscriptions/tenants';
  static const String subscriptionTrials = '$subscriptions/trials';

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
  static const String orderKitchenQueue = '$orders/kitchen/queue';
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
  static const String kitchenStations = '$kitchen/stations';
  static const String kitchenQueue = '$kitchen/queue';
  static const String kitchenMetrics = '$kitchen/metrics';
  static String kitchenStation(String id) => '$kitchenStations/$id';
  static String kitchenItemStatus(String id) => '$kitchen/items/$id/status';
  static String kitchenOrderStatus(String id) => '$kitchen/orders/$id/status';
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
  static const String inventoryCategories = '$inventory/categories';
  static const String inventoryUnits = '$inventory/units';
  static const String ingredients = '$inventory/ingredients';
  static const String inventoryStocks = '$inventory/stocks';
  static const String inventoryStockAdjust = '$inventoryStocks/adjust';
  static const String inventoryStockTransfer = '$inventoryStocks/transfer';
  static const String vendors = '$inventory/vendors';
  static const String purchaseOrders = '$inventory/purchase-orders';
  static const String inventoryAlerts = '$inventory/alerts';
  static const String inventoryValuation = '$inventory/valuation';
  static String ingredient(String id) => '$ingredients/$id';
  static String inventoryStock(String id) => '$inventoryStocks/$id';
  static String vendor(String id) => '$vendors/$id';
  static String purchaseOrder(String id) => '$purchaseOrders/$id';
  static String receivePurchaseOrder(String id) =>
      '${purchaseOrder(id)}/receive';
  static String resolveInventoryAlert(String id) =>
      '$inventoryAlerts/$id/resolve';
  static String recipe(String id) => '$recipes/$id';
  static String recipeIngredients(String id) => '${recipe(id)}/ingredients';
  static String recipeIngredient(String recipeId, String ingredientId) =>
      '${recipeIngredients(recipeId)}/$ingredientId';
  static String recipeCost(String id) => '${recipe(id)}/cost';
  static const String recipeProfitability = '$recipes/profitability';
  static String productionRecipe(String id) => '$productionRecipes/$id';
  static String consumptionDetail(String id) => '$consumption/$id';
  static const String customerSearch = '$customers/search';
  static const String customerDashboard = '$customers/dashboard';
  static String customer(String id) => '$customers/$id';
  static String customerAddresses(String id) => '${customer(id)}/addresses';
  static String customerAddress(String id) => '$customers/addresses/$id';
  static String customerNotes(String id) => '${customer(id)}/notes';
  static String customerOrders(String id) => '${customer(id)}/orders';
  static String customerBills(String id) => '${customer(id)}/bills';
  static String customerPayments(String id) => '${customer(id)}/payments';
  static String customerVisits(String id) => '${customer(id)}/visits';
  static String customerStats(String id) => '${customer(id)}/stats';
  static String employee(String id) => '$employees/$id';
  static String rbacUser(String id) => '$rbacUsers/$id';
  static String rbacUserStatus(String id) => '${rbacUser(id)}/status';
  static String rbacUserResetPassword(String id) =>
      '${rbacUser(id)}/reset-password';
  static String rbacUserRoles(String id) => '${rbacUser(id)}/roles';
  static String rbacUserOutlets(String id) => '${rbacUser(id)}/outlets';
  static const String rbacInviteUser = '$rbacUsers/invite';
  static String rbacRole(String id) => '$rbacRoles/$id';
  static String rbacRolePermissions(String id) => '${rbacRole(id)}/permissions';
  static String auditEvent(String id) => '$auditEvents/$id';
  static String notification(String id) => '$notifications/$id';
  static String notificationRead(String id) => '${notification(id)}/read';
  static String notificationAdminDetail(String id) => '$notificationAdmin/$id';
  static String communicationProvider(String id) =>
      '$communicationProviders/$id';
  static String communicationTemplate(String id) =>
      '$communicationTemplates/$id';
  static String communicationTemplateVersions(String id) =>
      '${communicationTemplate(id)}/versions';
  static String communicationTemplatePreview(String id) =>
      '${communicationTemplate(id)}/preview';
  static String communicationMessage(String id) => '$communicationMessages/$id';
  static String communicationMessageAttempts(String id) =>
      '${communicationMessage(id)}/attempts';
  static String subscriptionPlan(String id) => '$subscriptionPlans/$id';
  static String subscriptionPlanVersions(String id) =>
      '${subscriptionPlan(id)}/versions';
  static String subscriptionPlanFeatures(String id) =>
      '${subscriptionPlan(id)}/features';
  static String subscriptionPlanActivate(String id) =>
      '${subscriptionPlan(id)}/activate';
  static String subscriptionPlanDeactivate(String id) =>
      '${subscriptionPlan(id)}/deactivate';
  static String tenantSubscriptions(String tenantId) =>
      '$subscriptionTenants/$tenantId';
  static String tenantSubscriptionActivate(String tenantId) =>
      '${tenantSubscriptions(tenantId)}/activate';
  static String tenantSubscriptionCurrent(String tenantId) =>
      '${tenantSubscriptions(tenantId)}/current';
  static String tenantSubscriptionHistory(String tenantId) =>
      '${tenantSubscriptions(tenantId)}/history';
  static String tenantSubscription(String tenantId, String id) =>
      '${tenantSubscriptions(tenantId)}/subscriptions/$id';
  static String tenantSubscriptionUpgrade(String tenantId, String id) =>
      '${tenantSubscription(tenantId, id)}/upgrade';
  static String tenantSubscriptionDowngrade(String tenantId, String id) =>
      '${tenantSubscription(tenantId, id)}/downgrade';
  static String tenantSubscriptionSuspend(String tenantId, String id) =>
      '${tenantSubscription(tenantId, id)}/suspend';
  static String tenantSubscriptionResume(String tenantId, String id) =>
      '${tenantSubscription(tenantId, id)}/resume';
  static String tenantSubscriptionExpire(String tenantId, String id) =>
      '${tenantSubscription(tenantId, id)}/expire';
  static String tenantSubscriptionCancel(String tenantId, String id) =>
      '${tenantSubscription(tenantId, id)}/cancel';
  static String tenantEntitlements(String tenantId) =>
      '${tenantSubscriptions(tenantId)}/entitlements';
  static String tenantEntitlement(String tenantId, String featureKey) =>
      '${tenantEntitlements(tenantId)}/$featureKey';
  static String tenantEntitlementRevoke(String tenantId, String featureKey) =>
      '${tenantEntitlement(tenantId, featureKey)}/revoke';
  static String tenantUsage(String tenantId) =>
      '${tenantSubscriptions(tenantId)}/usage';
  static String tenantUsageFeature(String tenantId, String featureKey) =>
      '${tenantUsage(tenantId)}/$featureKey';
  static String tenantUsageAdjust(String tenantId, String featureKey) =>
      '${tenantUsageFeature(tenantId, featureKey)}/adjust';
  static String tenantTrials(String tenantId) =>
      '${tenantSubscriptions(tenantId)}/trials';
  static String tenantTrialStart(String tenantId) =>
      '${tenantTrials(tenantId)}/start';
  static String tenantTrial(String tenantId, String id) =>
      '${tenantTrials(tenantId)}/$id';
  static String tenantTrialHistory(String tenantId, String id) =>
      '${tenantTrial(tenantId, id)}/history';
  static String tenantTrialExtend(String tenantId, String id) =>
      '${tenantTrial(tenantId, id)}/extend';
  static String tenantTrialExpire(String tenantId, String id) =>
      '${tenantTrial(tenantId, id)}/expire';
  static String tenantTrialConvert(String tenantId, String id) =>
      '${tenantTrial(tenantId, id)}/convert';
  static const String subscriptionTrialsExpireDue =
      '$subscriptionTrials/expire-due';
  static String employeePerformance(String id) => '${employee(id)}/performance';
  static const String employeeDashboard = '$employees/dashboard';
  static String shift(String id) => '$shifts/$id';
  static const String assignShift = '$shifts/assign';
  static const String attendanceCheckIn = '$attendance/check-in';
  static const String attendanceCheckOut = '$attendance/check-out';
  static String employeeAttendance(String id) => '$attendance/$id';
  static const String employeePerformanceReport =
      '$reports/employees/performance';
  static const String salesSummaryReport = '$reports/sales/summary';
  static const String dailySalesReport = '$reports/sales/daily';
  static const String monthlySalesReport = '$reports/sales/monthly';
  static const String yearlySalesReport = '$reports/sales/yearly';
  static const String itemSalesReport = '$reports/sales/items';
  static const String categorySalesReport = '$reports/sales/categories';
  static const String gstSummaryReport = '$reports/gst/summary';
  static const String paymentSummaryReport = '$reports/payments/summary';
  static const String inventoryValueReport = '$reports/inventory/value';
  static const String customerTopReport = '$reports/customers/top';
  static const String outletPerformanceReport = '$reports/outlets/performance';
  static const String kitchenPerformanceReport = '$reports/kitchen/performance';
  static const String staffPerformanceReport = '$reports/staff/performance';
}
