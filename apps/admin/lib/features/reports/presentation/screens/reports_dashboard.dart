import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';
import 'customer_report_screen.dart';
import 'gst_report_screen.dart';
import 'inventory_report_screen.dart';
import 'kitchen_report_screen.dart';
import 'outlet_report_screen.dart';
import 'payment_report_screen.dart';
import 'sales_report_screen.dart';
import 'staff_performance_screen.dart';

class ReportsDashboard extends ConsumerWidget {
  const ReportsDashboard({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const query = ReportQuery();
    final metrics = ref.watch(dashboardProvider(query));
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          reportAsyncBody(
            metrics,
            (data) => Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ReportMetricCard(
                  label: "Today's Revenue",
                  value: data.todaySales,
                ),
                ReportMetricCard(
                  label: "Today's Orders",
                  value: data.todayOrders,
                ),
                ReportMetricCard(
                  label: "Today's Customers",
                  value: data.todayCustomers,
                ),
                ReportMetricCard(
                  label: 'Average Order Value',
                  value: data.averageOrderValue,
                ),
                ReportMetricCard(
                  label: 'Inventory Value',
                  value: data.inventoryValue,
                ),
                ReportMetricCard(
                  label: 'Low Stock Count',
                  value: data.lowStockAlerts,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          for (final action in <(String, IconData, Widget)>[
            ('Sales', Icons.trending_up, const SalesReportScreen()),
            ('GST', Icons.receipt_long, const GstReportScreen()),
            ('Payments', Icons.payments, const PaymentReportScreen()),
            ('Inventory', Icons.inventory, const InventoryReportScreen()),
            ('Customers', Icons.people, const CustomerReportScreen()),
            ('Outlets', Icons.store, const OutletReportScreen()),
            ('Kitchen', Icons.soup_kitchen, const KitchenReportScreen()),
            ('Staff', Icons.badge, const StaffPerformanceScreen()),
          ])
            ListTile(
              leading: Icon(action.$2),
              title: Text(action.$1),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(
                context,
              ).push(MaterialPageRoute<void>(builder: (_) => action.$3)),
            ),
        ],
      ),
    );
  }
}
