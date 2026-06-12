import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ReportMetricCard extends StatelessWidget {
  const ReportMetricCard({required this.label, required this.value, super.key});
  final String label;
  final Object value;
  @override
  Widget build(BuildContext context) => Card(
    child: SizedBox(
      width: 170,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$value', style: Theme.of(context).textTheme.headlineSmall),
            Text(label),
          ],
        ),
      ),
    ),
  );
}

Widget reportAsyncBody<T>(
  AsyncValue<T> value,
  Widget Function(T data) builder,
) => value.when(
  loading: () => const Center(child: CircularProgressIndicator()),
  error: (error, _) => Center(child: Text('Unable to load report: $error')),
  data: builder,
);
