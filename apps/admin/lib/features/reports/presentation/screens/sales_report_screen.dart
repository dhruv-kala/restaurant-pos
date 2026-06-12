import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';

class SalesReportScreen extends ConsumerWidget {
  const SalesReportScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(salesReportProvider(const ReportQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Sales Report')),
      body: reportAsyncBody(
        report,
        (data) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ReportMetricCard(label: 'Total Sales', value: data.totalSales),
                ReportMetricCard(label: 'Gross Sales', value: data.grossSales),
                ReportMetricCard(label: 'Net Sales', value: data.netSales),
                ReportMetricCard(label: 'Orders', value: data.totalOrders),
                ReportMetricCard(
                  label: 'Average Order',
                  value: data.averageOrderValue,
                ),
                ReportMetricCard(label: 'Refunds', value: data.refunds),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
