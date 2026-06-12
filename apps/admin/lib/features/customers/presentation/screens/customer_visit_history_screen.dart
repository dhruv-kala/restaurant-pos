import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/customers_providers.dart';

class CustomerVisitHistoryScreen extends ConsumerWidget {
  const CustomerVisitHistoryScreen({required this.customerId, super.key});
  final String customerId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Visit history')),
    body: FutureBuilder(
      future: ref.read(customersRepositoryProvider).visits(customerId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        return ListView(
          children: [
            for (final visit in snapshot.data!)
              ListTile(
                title: Text(visit.outletName ?? visit.outletId),
                subtitle: Text(visit.visitDate.toLocal().toString()),
                trailing: Text('${visit.totalSpend}'),
              ),
          ],
        );
      },
    ),
  );
}
