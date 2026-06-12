int _int(Map<String, dynamic> json, String key) =>
    (json[key] as num?)?.toInt() ?? 0;
double _double(Map<String, dynamic> json, String key) =>
    (json[key] as num?)?.toDouble() ?? 0;

class SalesSummaryReport {
  const SalesSummaryReport({
    required this.totalSales,
    required this.grossSales,
    required this.netSales,
    required this.totalOrders,
    required this.averageOrderValue,
    required this.discounts,
    required this.taxes,
    required this.refunds,
  });
  factory SalesSummaryReport.fromJson(Map<String, dynamic> json) =>
      SalesSummaryReport(
        totalSales: _int(json, 'totalSales'),
        grossSales: _int(json, 'grossSales'),
        netSales: _int(json, 'netSales'),
        totalOrders: _int(json, 'totalOrders'),
        averageOrderValue: _int(json, 'averageOrderValue'),
        discounts: _int(json, 'discounts'),
        taxes: _int(json, 'taxes'),
        refunds: _int(json, 'refunds'),
      );
  final int totalSales;
  final int grossSales;
  final int netSales;
  final int totalOrders;
  final int averageOrderValue;
  final int discounts;
  final int taxes;
  final int refunds;
}

class GSTSummaryReport {
  const GSTSummaryReport({
    required this.cgst,
    required this.sgst,
    required this.igst,
    required this.taxableAmount,
    required this.taxAmount,
    required this.invoiceCount,
  });
  factory GSTSummaryReport.fromJson(Map<String, dynamic> json) =>
      GSTSummaryReport(
        cgst: _int(json, 'cgst'),
        sgst: _int(json, 'sgst'),
        igst: _int(json, 'igst'),
        taxableAmount: _int(json, 'taxableAmount'),
        taxAmount: _int(json, 'taxAmount'),
        invoiceCount: _int(json, 'invoiceCount'),
      );
  final int cgst;
  final int sgst;
  final int igst;
  final int taxableAmount;
  final int taxAmount;
  final int invoiceCount;
}

class PaymentSummaryReport {
  const PaymentSummaryReport({
    required this.cash,
    required this.upi,
    required this.card,
    required this.wallet,
    required this.giftCard,
    required this.refunds,
    required this.failedPayments,
    required this.totalCollected,
  });
  factory PaymentSummaryReport.fromJson(Map<String, dynamic> json) =>
      PaymentSummaryReport(
        cash: _int(json, 'cash'),
        upi: _int(json, 'upi'),
        card: _int(json, 'card'),
        wallet: _int(json, 'wallet'),
        giftCard: _int(json, 'giftCard'),
        refunds: _int(json, 'refunds'),
        failedPayments: _int(json, 'failedPayments'),
        totalCollected: _int(json, 'totalCollected'),
      );
  final int cash;
  final int upi;
  final int card;
  final int wallet;
  final int giftCard;
  final int refunds;
  final int failedPayments;
  final int totalCollected;
}

class OutletPerformanceReport {
  const OutletPerformanceReport({
    required this.outlet,
    required this.sales,
    required this.orders,
    required this.customers,
    required this.profit,
    required this.inventoryValue,
  });
  factory OutletPerformanceReport.fromJson(Map<String, dynamic> json) =>
      OutletPerformanceReport(
        outlet: json['outlet'] as String? ?? '',
        sales: _int(json, 'sales'),
        orders: _int(json, 'orders'),
        customers: _int(json, 'customers'),
        profit: _int(json, 'profit'),
        inventoryValue: _int(json, 'inventoryValue'),
      );
  final String outlet;
  final int sales;
  final int orders;
  final int customers;
  final int profit;
  final int inventoryValue;
}

class InventorySummaryReport {
  const InventorySummaryReport({
    this.currentInventoryValue = 0,
    this.consumptionCost = 0,
    this.wastageCost = 0,
    this.lowStockItems = 0,
  });
  factory InventorySummaryReport.fromJson(Map<String, dynamic> json) =>
      InventorySummaryReport(
        currentInventoryValue: _int(json, 'currentInventoryValue'),
        consumptionCost: _int(json, 'consumptionCost'),
        wastageCost: _int(json, 'wastageCost'),
        lowStockItems: _int(json, 'lowStockItems'),
      );
  final int currentInventoryValue;
  final int consumptionCost;
  final int wastageCost;
  final int lowStockItems;
}

class CustomerSummaryReport {
  const CustomerSummaryReport({
    required this.customer,
    required this.orders,
    required this.spend,
    required this.visits,
    required this.averageSpend,
  });
  factory CustomerSummaryReport.fromJson(Map<String, dynamic> json) =>
      CustomerSummaryReport(
        customer: json['customer'] as String? ?? '',
        orders: _int(json, 'orders'),
        spend: _int(json, 'spend'),
        visits: _int(json, 'visits'),
        averageSpend: _int(json, 'averageSpend'),
      );
  final String customer;
  final int orders;
  final int spend;
  final int visits;
  final int averageSpend;
}

class DashboardMetrics {
  const DashboardMetrics({
    required this.todaySales,
    required this.todayOrders,
    required this.todayCustomers,
    required this.averageOrderValue,
    required this.lowStockAlerts,
    required this.pendingOrders,
    required this.inventoryValue,
    required this.topSellingItems,
  });
  factory DashboardMetrics.fromJson(Map<String, dynamic> json) =>
      DashboardMetrics(
        todaySales: _int(json, 'todaySales'),
        todayOrders: _int(json, 'todayOrders'),
        todayCustomers: _int(json, 'todayCustomers'),
        averageOrderValue: _int(json, 'averageOrderValue'),
        lowStockAlerts: _int(json, 'lowStockAlerts'),
        pendingOrders: _int(json, 'pendingOrders'),
        inventoryValue: _int(json, 'inventoryValue'),
        topSellingItems: (json['topSellingItems'] as List? ?? const [])
            .map(
              (item) => ReportSeriesPoint.fromJson(
                Map<String, dynamic>.from(item as Map),
              ),
            )
            .toList(growable: false),
      );
  final int todaySales;
  final int todayOrders;
  final int todayCustomers;
  final int averageOrderValue;
  final int lowStockAlerts;
  final int pendingOrders;
  final int inventoryValue;
  final List<ReportSeriesPoint> topSellingItems;
}

class ReportSeriesPoint {
  const ReportSeriesPoint({
    required this.label,
    required this.value,
    this.secondaryValue = 0,
  });
  factory ReportSeriesPoint.fromJson(Map<String, dynamic> json) =>
      ReportSeriesPoint(
        label:
            (json['label'] ?? json['itemName'] ?? json['paymentMethod'] ?? '')
                as String,
        value: _double(
          json,
          json.containsKey('sales')
              ? 'sales'
              : json.containsKey('quantity')
              ? 'quantity'
              : 'amount',
        ),
        secondaryValue: _double(json, 'revenue'),
      );
  final String label;
  final double value;
  final double secondaryValue;
}
