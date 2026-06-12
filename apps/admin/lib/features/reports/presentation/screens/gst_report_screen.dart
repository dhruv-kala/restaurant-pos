import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';

class GstReportScreen extends ConsumerWidget {
  const GstReportScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(gstReportProvider(const ReportQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('GST Report')),
      body: reportAsyncBody(
        report,
        (data) => Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              ReportMetricCard(label: 'CGST', value: data.cgst),
              ReportMetricCard(label: 'SGST', value: data.sgst),
              ReportMetricCard(label: 'IGST', value: data.igst),
              ReportMetricCard(
                label: 'Taxable Amount',
                value: data.taxableAmount,
              ),
              ReportMetricCard(label: 'Tax Amount', value: data.taxAmount),
              ReportMetricCard(label: 'Invoices', value: data.invoiceCount),
            ],
          ),
        ),
      ),
    );
  }
}
