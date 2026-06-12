import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';

class OutletReportScreen extends ConsumerWidget {
  const OutletReportScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(outletReportProvider(const ReportQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Outlet Report')),
      body: reportAsyncBody(
        report,
        (data) => ListView.builder(
          itemCount: data.length,
          itemBuilder: (_, index) {
            final row = data[index];
            return ListTile(
              title: Text(row.outlet),
              subtitle: Text(
                '${row.orders} orders | ${row.customers} customers',
              ),
              trailing: Text('${row.sales}'),
            );
          },
        ),
      ),
    );
  }
}
