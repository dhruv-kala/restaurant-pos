import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';

class StaffPerformanceScreen extends ConsumerWidget {
  const StaffPerformanceScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(staffReportProvider(const ReportQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Staff Performance')),
      body: reportAsyncBody(
        report,
        (data) => ListView.builder(
          itemCount: data.length,
          itemBuilder: (_, index) {
            final row = data[index];
            return ListTile(
              title: Text('${row['employee'] ?? ''}'),
              subtitle: Text('${row['ordersHandled'] ?? 0} orders'),
              trailing: Text('${row['waiterSales'] ?? 0}'),
            );
          },
        ),
      ),
    );
  }
}
