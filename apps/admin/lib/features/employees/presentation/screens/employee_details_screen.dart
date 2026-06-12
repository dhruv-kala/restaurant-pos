import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/employees_providers.dart';
import 'edit_employee_screen.dart';

class EmployeeDetailsScreen extends ConsumerWidget {
  const EmployeeDetailsScreen({required this.employeeId, super.key});
  final String employeeId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final employee = ref.watch(employeeDetailsProvider(employeeId));
    return Scaffold(
      appBar: AppBar(title: const Text('Employee Details')),
      body: employee.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (data) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              data.displayName,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            ListTile(
              title: const Text('Employee Code'),
              subtitle: Text(data.employeeCode),
            ),
            ListTile(
              title: const Text('Designation'),
              subtitle: Text(data.designation),
            ),
            ListTile(
              title: const Text('Department'),
              subtitle: Text(data.department),
            ),
            ListTile(
              title: const Text('Status'),
              subtitle: Text(data.status.wireName),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => EditEmployeeScreen(employee: data),
                ),
              ),
              child: const Text('Edit Employee'),
            ),
          ],
        ),
      ),
    );
  }
}
