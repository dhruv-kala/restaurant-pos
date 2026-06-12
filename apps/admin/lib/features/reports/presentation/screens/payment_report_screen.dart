import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';

class PaymentReportScreen extends ConsumerWidget {
  const PaymentReportScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(paymentReportProvider(const ReportQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Payment Report')),
      body: reportAsyncBody(
        report,
        (data) => Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              ReportMetricCard(label: 'Cash', value: data.cash),
              ReportMetricCard(label: 'UPI', value: data.upi),
              ReportMetricCard(label: 'Card', value: data.card),
              ReportMetricCard(label: 'Wallet', value: data.wallet),
              ReportMetricCard(label: 'Refunds', value: data.refunds),
              ReportMetricCard(
                label: 'Total Collected',
                value: data.totalCollected,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
