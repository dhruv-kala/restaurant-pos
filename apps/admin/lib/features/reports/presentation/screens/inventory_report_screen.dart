import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';

class InventoryReportScreen extends ConsumerWidget {
  const InventoryReportScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(inventoryReportProvider(const ReportQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Inventory Report')),
      body: reportAsyncBody(
        report,
        (data) => Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              ReportMetricCard(
                label: 'Inventory Value',
                value: data.currentInventoryValue,
              ),
              ReportMetricCard(
                label: 'Consumption Cost',
                value: data.consumptionCost,
              ),
              ReportMetricCard(label: 'Wastage Cost', value: data.wastageCost),
              ReportMetricCard(
                label: 'Low Stock Items',
                value: data.lowStockItems,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
