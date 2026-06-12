import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/report_query.dart';
import '../providers/reports_providers.dart';
import '../widgets/report_widgets.dart';

class KitchenReportScreen extends ConsumerWidget {
  const KitchenReportScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(kitchenReportProvider(const ReportQuery()));
    return Scaffold(
      appBar: AppBar(title: const Text('Kitchen Report')),
      body: reportAsyncBody(
        report,
        (data) => Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: data.entries
                .map(
                  (entry) => ReportMetricCard(
                    label: entry.key,
                    value: entry.value as Object? ?? 0,
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
  }
}
