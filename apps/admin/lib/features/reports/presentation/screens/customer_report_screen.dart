import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';

class CustomerReportScreen extends ConsumerWidget {
  const CustomerReportScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(customerReportProvider(const ReportQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Customer Report')),
      body: reportAsyncBody(
        report,
        (data) => ListView.builder(
          itemCount: data.length,
          itemBuilder: (_, index) {
            final row = data[index];
            return ListTile(
              title: Text(row.customer),
              subtitle: Text('${row.orders} orders | ${row.visits} visits'),
              trailing: Text('${row.spend}'),
            );
          },
        ),
      ),
    );
  }
}
